import { Prisma as PrismaNamespace } from '../../prisma/generated/prisma/client'
import { CheckInAiJobStatus } from '../../prisma/generated/prisma/enums'
import {
    CHECK_IN_AI_JOB_MAX_ATTEMPTS,
    CHECK_IN_AI_JOB_RETRY_DELAY_MS,
    CHECK_IN_AI_JOB_RUN_IMMEDIATELY,
    CHECK_IN_AI_JOB_STALE_ERROR
} from '../constants/checkInAiJob'
import Prisma from '../utils/prismaClient'

export type ClaimedCheckInAiJob = {
    id: string
    checkInId: string
    userId: string
    attempts: number
    lockedAt: Date
}

// One row per check-in: re-submitting the same day's check-in re-queues the row.
// Returns the job id, which is what the broker message carries.
export const enqueueJob = async (
    checkInId: string,
    userId: string
): Promise<string> => {
    const job = await Prisma.checkInAiJob.upsert({
        where: { checkInId },
        create: {
            checkInId,
            userId,
            runAfter: CHECK_IN_AI_JOB_RUN_IMMEDIATELY
        },
        update: {
            status: CheckInAiJobStatus.PENDING,
            attempts: 0,
            lockedAt: null,
            lastError: null,
            publishedAt: null,
            runAfter: CHECK_IN_AI_JOB_RUN_IMMEDIATELY
        },
        select: { id: true }
    })

    return job.id
}

const staleCutoff = (staleMs: number) =>
    PrismaNamespace.sql`now() - ${staleMs} * interval '1 millisecond'`

// SKIP LOCKED lets several instances claim different jobs without waiting on
// each other; a PENDING job waits for its runAfter (retry backoff);
// a RUNNING job locked longer than staleMs is taken over (dead worker).
// lockedAt is written with the database clock, so the cutoff is computed in
// SQL with the same clock and app clock skew cannot make a live job look dead.
// A stale job that already used all its attempts is failed first, so a job
// that keeps killing the process is not retried forever.
export const claimNextJob = async (
    staleMs: number
): Promise<ClaimedCheckInAiJob | null> => {
    await Prisma.$executeRaw`
        UPDATE "CheckInAiJob"
        SET "status" = 'FAILED',
            "lockedAt" = NULL,
            "lastError" = ${CHECK_IN_AI_JOB_STALE_ERROR},
            "updatedAt" = now()
        WHERE "status" = 'RUNNING'
            AND "attempts" >= ${CHECK_IN_AI_JOB_MAX_ATTEMPTS}
            AND "lockedAt" < ${staleCutoff(staleMs)}
    `

    const [job] = await Prisma.$queryRaw<ClaimedCheckInAiJob[]>`
        UPDATE "CheckInAiJob"
        SET "status" = 'RUNNING',
            "lockedAt" = now(),
            "attempts" = "attempts" + 1,
            "updatedAt" = now()
        WHERE "id" = (
            SELECT "id" FROM "CheckInAiJob"
            WHERE ("status" = 'PENDING' AND "runAfter" <= now())
                OR (
                    "status" = 'RUNNING'
                    AND "lockedAt" < ${staleCutoff(staleMs)}
                )
            ORDER BY "createdAt"
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING "id", "checkInId", "userId", "attempts", "lockedAt"
    `

    return job ?? null
}

// True while this worker's claim is intact. A re-submit (row back to PENDING)
// or a takeover changes status or lockedAt, so a superseded worker sees false.
export const holdsClaim = async (job: ClaimedCheckInAiJob): Promise<boolean> => {
    const count = await Prisma.checkInAiJob.count({
        where: {
            id: job.id,
            status: CheckInAiJobStatus.RUNNING,
            lockedAt: job.lockedAt
        }
    })

    return count === 1
}

// Only the worker that still holds the claim may finish the job. If the
// check-in was re-submitted (row back to PENDING) or another worker took the
// job over, the claim no longer matches and the result is dropped, so the
// newer data is processed instead of being marked done.
// updatedAt is written with the database clock, the one requeueMissedJobs
// compares it with, so app clock skew cannot shift the retry window.
const finishJob = async (
    job: ClaimedCheckInAiJob,
    status: CheckInAiJobStatus,
    lastError: string | null
): Promise<boolean> => {
    const count = await Prisma.$executeRaw`
        UPDATE "CheckInAiJob"
        SET "status" = ${status}::"CheckInAiJobStatus",
            "lockedAt" = NULL,
            "lastError" = ${lastError},
            "updatedAt" = now()
        WHERE "id" = ${job.id}
            AND "status" = 'RUNNING'
            AND "lockedAt" = ${job.lockedAt}
    `

    return count === 1
}

export const markJobDone = (job: ClaimedCheckInAiJob) =>
    finishJob(
        job,
        CheckInAiJobStatus.DONE,
        null
    )

// runAfter is written with the database clock, the one claimNextJob compares
// it with, so app and database clock skew cannot shorten or stretch the delay.
// Same claim guard as finishJob.
export const markJobRetry = async (
    job: ClaimedCheckInAiJob,
    lastError: string
): Promise<boolean> => {
    const count = await Prisma.$executeRaw`
        UPDATE "CheckInAiJob"
        SET "status" = 'PENDING',
            "lockedAt" = NULL,
            "lastError" = ${lastError},
            "publishedAt" = NULL,
            "runAfter" = now() + ${CHECK_IN_AI_JOB_RETRY_DELAY_MS} * interval '1 millisecond',
            "updatedAt" = now()
        WHERE "id" = ${job.id}
            AND "status" = 'RUNNING'
            AND "lockedAt" = ${job.lockedAt}
    `

    return count === 1
}

export const markJobFailed = (
    job: ClaimedCheckInAiJob,
    lastError: string
) => finishJob(
    job,
    CheckInAiJobStatus.FAILED,
    lastError
)

// Safety net for check-ins that never got insights: the job insert failed
// after the check-in was saved (e.g. the app started before the migration),
// or the job exhausted its attempts. Only check-ins created within lookbackMs
// are considered. FAILED jobs are re-queued once their updatedAt is older than
// failedAfterMs; PENDING, RUNNING and DONE jobs are left alone (a stale
// RUNNING job is taken over by claimNextJob). Both cutoffs use the database
// clock, the one every job timestamp is written with.
export const requeueMissedJobs = async (
    lookbackMs: number,
    failedAfterMs: number
): Promise<void> => {
    const lookbackCutoff = staleCutoff(lookbackMs)

    await Prisma.$executeRaw`
        INSERT INTO "CheckInAiJob" (
            "id", "checkInId", "userId", "status", "attempts",
            "runAfter", "createdAt", "updatedAt"
        )
        SELECT
            gen_random_uuid(), c."id", p."userId", 'PENDING', 0,
            to_timestamp(0), now(), now()
        FROM "DailyCheckIn" c
        JOIN "Profile" p ON p."id" = c."profileId"
        LEFT JOIN "CheckInAiJob" j ON j."checkInId" = c."id"
        WHERE j."id" IS NULL
            AND c."createdAt" > ${lookbackCutoff}
        ON CONFLICT ("checkInId") DO NOTHING
    `

    await Prisma.$executeRaw`
        UPDATE "CheckInAiJob" j
        SET "status" = 'PENDING',
            "attempts" = 0,
            "lockedAt" = NULL,
            "lastError" = NULL,
            "publishedAt" = NULL,
            "runAfter" = to_timestamp(0),
            "updatedAt" = now()
        FROM "DailyCheckIn" c
        WHERE c."id" = j."checkInId"
            AND j."status" = 'FAILED'
            AND j."updatedAt" < ${staleCutoff(failedAfterMs)}
            AND c."createdAt" > ${lookbackCutoff}
    `
}

// Same claim as claimNextJob, but for the job a broker message names. runAfter is
// not checked: the broker's retry queue decides when a retried message returns.
// A RUNNING job is taken over only when its claim is stale, so a duplicate
// message for a job another consumer is working on does nothing.
export const claimJobById = async (
    jobId: string,
    staleMs: number
): Promise<ClaimedCheckInAiJob | null> => {
    const [job] = await Prisma.$queryRaw<ClaimedCheckInAiJob[]>`
        UPDATE "CheckInAiJob"
        SET "status" = 'RUNNING',
            "lockedAt" = now(),
            "attempts" = "attempts" + 1,
            "updatedAt" = now()
        WHERE "id" = ${jobId}
            AND (
                "status" = 'PENDING'
                OR (
                    "status" = 'RUNNING'
                    AND "lockedAt" < ${staleCutoff(staleMs)}
                )
            )
        RETURNING "id", "checkInId", "userId", "attempts", "lockedAt"
    `

    return job ?? null
}

// Only a row still waiting is marked; a job already claimed keeps its state.
export const markJobPublished = async (jobId: string): Promise<void> => {
    await Prisma.$executeRaw`
        UPDATE "CheckInAiJob"
        SET "publishedAt" = now()
        WHERE "id" = ${jobId}
            AND "status" = 'PENDING'
    `
}

// Rows the sweeper must (re)publish: waiting, due, and either never published or
// published longer ago than republishAfterMs without anybody claiming them (the
// message was lost). graceMs keeps it away from a row the request path is
// publishing right now.
export const findJobIdsToPublish = async (
    limit: number,
    republishAfterMs: number,
    graceMs: number
): Promise<string[]> => {
    const rows = await Prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "CheckInAiJob"
        WHERE "status" = 'PENDING'
            AND "runAfter" <= now()
            AND "updatedAt" < ${staleCutoff(graceMs)}
            AND (
                "publishedAt" IS NULL
                OR "publishedAt" < ${staleCutoff(republishAfterMs)}
            )
        ORDER BY "createdAt"
        LIMIT ${limit}
    `

    return rows.map(row => row.id)
}

// Numbers for the log line: how many jobs wait and how old the oldest is.
export const getQueueStats = async (): Promise<{
    waiting: number
    oldestWaitingSeconds: number
}> => {
    const [stats] = await Prisma.$queryRaw<{
        waiting: bigint
        oldest: number | null
    }[]>`
        SELECT count(*) AS waiting,
            extract(epoch FROM now() - min("createdAt")) AS oldest
        FROM "CheckInAiJob"
        WHERE "status" = 'PENDING'
    `

    return {
        waiting: Number(stats?.waiting ?? 0),
        oldestWaitingSeconds: Math.round(Number(stats?.oldest ?? 0))
    }
}
