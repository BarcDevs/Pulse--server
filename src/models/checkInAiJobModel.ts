import { CheckInAiJobStatus } from '../../prisma/generated/prisma/enums'
import {
    CHECK_IN_AI_JOB_MAX_ATTEMPTS,
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

// One row per check-in: re-submitting the same day's check-in re-queues the row
export const enqueueJob = async (
    checkInId: string,
    userId: string
): Promise<void> => {
    await Prisma.checkInAiJob.upsert({
        where: { checkInId },
        create: { checkInId, userId },
        update: {
            status: CheckInAiJobStatus.PENDING,
            attempts: 0,
            lockedAt: null,
            lastError: null
        }
    })
}

// SKIP LOCKED lets several instances claim different jobs without waiting on
// each other; a RUNNING job past staleBefore is taken over (dead worker).
// A stale job that already used all its attempts is failed first, so a job
// that keeps killing the process is not retried forever.
export const claimNextJob = async (
    staleBefore: Date
): Promise<ClaimedCheckInAiJob | null> => {
    await Prisma.checkInAiJob.updateMany({
        where: {
            status: CheckInAiJobStatus.RUNNING,
            lockedAt: { lt: staleBefore },
            attempts: { gte: CHECK_IN_AI_JOB_MAX_ATTEMPTS }
        },
        data: {
            status: CheckInAiJobStatus.FAILED,
            lockedAt: null,
            lastError: CHECK_IN_AI_JOB_STALE_ERROR
        }
    })

    const [job] = await Prisma.$queryRaw<ClaimedCheckInAiJob[]>`
        UPDATE "CheckInAiJob"
        SET "status" = 'RUNNING',
            "lockedAt" = now(),
            "attempts" = "attempts" + 1,
            "updatedAt" = now()
        WHERE "id" = (
            SELECT "id" FROM "CheckInAiJob"
            WHERE "status" = 'PENDING'
                OR ("status" = 'RUNNING' AND "lockedAt" < ${staleBefore})
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
const finishJob = async (
    job: ClaimedCheckInAiJob,
    status: CheckInAiJobStatus,
    lastError: string | null
): Promise<boolean> => {
    const { count } = await Prisma.checkInAiJob.updateMany({
        where: {
            id: job.id,
            status: CheckInAiJobStatus.RUNNING,
            lockedAt: job.lockedAt
        },
        data: { status, lockedAt: null, lastError }
    })

    return count === 1
}

export const markJobDone = (job: ClaimedCheckInAiJob) =>
    finishJob(
        job,
        CheckInAiJobStatus.DONE,
        null
    )

export const markJobRetry = (
    job: ClaimedCheckInAiJob,
    lastError: string
) => finishJob(
    job,
    CheckInAiJobStatus.PENDING,
    lastError
)

export const markJobFailed = (
    job: ClaimedCheckInAiJob,
    lastError: string
) => finishJob(
    job,
    CheckInAiJobStatus.FAILED,
    lastError
)
