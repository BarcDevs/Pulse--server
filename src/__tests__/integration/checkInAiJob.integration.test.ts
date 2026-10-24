import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import {
    CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS,
    CHECK_IN_AI_JOB_MAX_ATTEMPTS,
    CHECK_IN_AI_JOB_RETRY_DELAY_MS,
    CHECK_IN_AI_JOB_STALE_MS,
    CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS
} from '../../constants/checkInAiJob'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { hourInMs, minuteInMs, secondInMs } from '../../constants/time'
import { createToken } from '../../lib/authCrypto'
import * as jobModel from '../../models/checkInAiJobModel'
import { drainJobs } from '../../services/checkInAiWorkerService'
import * as insightGenerationService from '../../services/insightGenerationService'
import * as recommendationsService from '../../services/recommendationsService'
import Prisma from '../../utils/prismaClient'

jest.mock('../../services/insightGenerationService')
jest.mock('../../services/recommendationsService')

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const CHECK_IN_URL = `/api/${serverConfig.apiVersion}/check-in`

const csrfLib = new Csrf()

const testUser = {
    firstName: 'Job',
    lastName: 'Tester',
    email: 'job@test.com',
    password: 'Password123!'
}

const postCheckIn = async (moodScore = 7) => {
    await supertest(App).post(SIGNUP_URL).send(testUser)
    const dbUser = await Prisma.user.findUnique({
        where: { email: testUser.email }
    })
    const secret = csrfLib.secretSync()

    const res = await supertest(App)
        .post(CHECK_IN_URL)
        .set('Cookie', [
            `accessToken=${createToken(dbUser!)}`,
            `_csrf=${secret}`
        ])
        .set('x-csrf-token', csrfLib.create(secret))
        .send({ moodScore, painLevel: 3, activities: [] })

    return { res, userId: dbUser!.id }
}

const readDatabaseNow = async () => {
    const [{ now }] = await Prisma.$queryRaw<{ now: Date }[]>`SELECT now() AS now`

    return now
}


const ageCheckIn = (checkInId: string, ageMs: number) => Prisma.$executeRaw`
    UPDATE "DailyCheckIn"
    SET "createdAt" = now() - ${ageMs} * interval '1 millisecond'
    WHERE "id" = ${checkInId}
`

const ageJobUpdate = (checkInId: string, ageMs: number) => Prisma.$executeRaw`
    UPDATE "CheckInAiJob"
    SET "updatedAt" = now() - ${ageMs} * interval '1 millisecond'
    WHERE "checkInId" = ${checkInId}
`

const failJob = async (checkInId: string, updatedAgoMs: number) => {
    await Prisma.checkInAiJob.update({
        where: { checkInId },
        data: {
            status: 'FAILED',
            attempts: CHECK_IN_AI_JOB_MAX_ATTEMPTS,
            lastError: 'Error'
        }
    })
    await ageJobUpdate(checkInId, updatedAgoMs)
}

const sweep = () => jobModel.requeueMissedJobs(
    CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS,
    CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS
)

const PAST_RETRY_WINDOW_MS = CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS + minuteInMs

// A negative window puts the cutoff in the future, so every RUNNING job counts as stale
const ALL_STALE_MS = -minuteInMs

describe('Check-in AI job — Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockResolvedValue(undefined)
        jest.spyOn(recommendationsService, 'generateRecommendationsSafely')
            .mockResolvedValue(undefined)
    })

    it('returns the check-in without running the AI and queues one job', async () => {
        const { res } = await postCheckIn()

        expect(res.status).toBe(HttpStatusCodes.CREATED)
        expect(res.body.data.insightsStatus).toBe('pending')
        expect(insightGenerationService.generateInsightForCheckIn)
            .not.toHaveBeenCalled()

        const jobs = await Prisma.checkInAiJob.findMany()
        expect(jobs).toHaveLength(1)
        expect(jobs[0].status).toBe('PENDING')
        expect(jobs[0].checkInId).toBe(res.body.data.id)
    })

    it('re-submitting the same day keeps one job and re-queues it', async () => {
        const { res } = await postCheckIn()
        await Prisma.checkInAiJob.updateMany({ data: { status: 'DONE', attempts: 2 } })

        await jobModel.enqueueJob(res.body.data.id, 'user')

        const jobs = await Prisma.checkInAiJob.findMany()
        expect(jobs).toHaveLength(1)
        expect(jobs[0].status).toBe('PENDING')
        expect(jobs[0].attempts).toBe(0)
    })

    it('does not hand out a retried job before its backoff passes', async () => {
        await postCheckIn()
        const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)

        await jobModel.markJobRetry(claimed!, 'Error')

        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.status).toBe('PENDING')
        expect(job.runAfter.getTime()).toBeGreaterThan(
            Date.now() + CHECK_IN_AI_JOB_RETRY_DELAY_MS - secondInMs
        )
        expect(await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)).toBeNull()

        await Prisma.checkInAiJob.updateMany({
            data: { runAfter: new Date(Date.now() - secondInMs) }
        })

        const retried = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        expect(retried!.attempts).toBe(2)
    })

    describe.each([
        [
            'ahead of',
            hourInMs
        ],
        [
            'behind',
            -hourInMs
        ]
    ])('when the app clock is an hour %s the database clock', (_, skewMs) => {
        // Only Date is faked (both Date.now and new Date()), timers stay real
        const skewAppClock = () => {
            jest.useFakeTimers({
                now: Date.now() + skewMs,
                doNotFake: [
                    'hrtime',
                    'nextTick',
                    'performance',
                    'queueMicrotask',
                    'setImmediate',
                    'clearImmediate',
                    'setInterval',
                    'clearInterval',
                    'setTimeout',
                    'clearTimeout'
                ]
            })
        }

        afterEach(() => {
            jest.useRealTimers()
        })

        it('schedules the retry by the database clock', async () => {
            await postCheckIn()
            const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            skewAppClock()
            const before = await readDatabaseNow()

            expect(await jobModel.markJobRetry(claimed!, 'Error')).toBe(true)

            const after = await readDatabaseNow()
            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.runAfter.getTime()).toBeGreaterThanOrEqual(
                before.getTime() + CHECK_IN_AI_JOB_RETRY_DELAY_MS - secondInMs
            )
            expect(job.runAfter.getTime()).toBeLessThanOrEqual(
                after.getTime() + CHECK_IN_AI_JOB_RETRY_DELAY_MS + secondInMs
            )
            expect(await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)).toBeNull()
        })

        it('makes a first job claimable at once despite the skew', async () => {
            skewAppClock()

            await postCheckIn()

            const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            expect(claimed!.attempts).toBe(1)
        })

        it('re-submitting a backing-off job makes it claimable at once despite the skew', async () => {
            const { res, userId } = await postCheckIn()
            const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            skewAppClock()
            await jobModel.markJobRetry(claimed!, 'Error')

            await jobModel.enqueueJob(res.body.data.id, userId)

            const fresh = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            expect(fresh!.attempts).toBe(1)
        })

        it('does not take over a fresh RUNNING job', async () => {
            await postCheckIn()
            await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            skewAppClock()

            expect(await drainJobs()).toBe(0)

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe('RUNNING')
            expect(job.attempts).toBe(1)
        })

        it('takes over a RUNNING job locked past the stale window', async () => {
            await postCheckIn()
            await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
            await Prisma.checkInAiJob.updateMany({
                data: {
                    lockedAt: new Date(
                        Date.now() - CHECK_IN_AI_JOB_STALE_MS - minuteInMs
                    )
                }
            })
            skewAppClock()

            expect(await drainJobs()).toBe(1)

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe('DONE')
            expect(job.attempts).toBe(2)
        })

        it('fails an exhausted stale job only once it is past the window', async () => {
            await postCheckIn()
            await Prisma.checkInAiJob.updateMany({
                data: {
                    status: 'RUNNING',
                    attempts: CHECK_IN_AI_JOB_MAX_ATTEMPTS
                }
            })
            await Prisma.$executeRaw`
                UPDATE "CheckInAiJob"
                SET "lockedAt" = now()
            `
            skewAppClock()

            await drainJobs()
            expect((await Prisma.checkInAiJob.findFirstOrThrow()).status)
                .toBe('RUNNING')

            await Prisma.$executeRaw`
                UPDATE "CheckInAiJob"
                SET "lockedAt" = now() - ${CHECK_IN_AI_JOB_STALE_MS + minuteInMs} * interval '1 millisecond'
            `
            await drainJobs()

            expect((await Prisma.checkInAiJob.findFirstOrThrow()).status)
                .toBe('FAILED')
        })
    })

    it('does not retry a job whose claim was lost', async () => {
        const { res, userId } = await postCheckIn()
        const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        await jobModel.enqueueJob(res.body.data.id, userId)

        expect(await jobModel.markJobRetry(claimed!, 'Error')).toBe(false)

        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.attempts).toBe(0)
        expect(job.lastError).toBeNull()
    })

    it('re-submitting a backing-off job makes it claimable at once', async () => {
        const { res, userId } = await postCheckIn()
        const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        await jobModel.markJobRetry(claimed!, 'Error')
        expect(await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)).toBeNull()

        await jobModel.enqueueJob(res.body.data.id, userId)

        const fresh = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        expect(fresh!.attempts).toBe(1)
    })

    it('two workers claiming at once run the job only once', async () => {
        await postCheckIn()

        const claims = await Promise.all([
            jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS),
            jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        ])

        expect(claims.filter(Boolean)).toHaveLength(1)
        expect(claims.find(Boolean)!.attempts).toBe(1)
    })

    it('takes over a RUNNING job whose worker died, but not a fresh one', async () => {
        await postCheckIn()
        await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)

        expect(await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)).toBeNull()

        const taken = await jobModel.claimNextJob(ALL_STALE_MS)
        expect(taken!.attempts).toBe(2)
    })

    it('drops the result of a worker whose job was re-submitted meanwhile', async () => {
        const { res, userId } = await postCheckIn()
        const claimed = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)

        await jobModel.enqueueJob(res.body.data.id, userId)

        expect(await jobModel.markJobDone(claimed!)).toBe(false)
        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.status).toBe('PENDING')
    })

    it('drops the result of a worker whose job another worker took over', async () => {
        await postCheckIn()
        const first = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        const second = await jobModel.claimNextJob(ALL_STALE_MS)

        expect(await jobModel.markJobDone(first!)).toBe(false)
        expect(await jobModel.markJobDone(second!)).toBe(true)
    })

    it('reports the claim as held until the job is re-submitted or taken over', async () => {
        const { res, userId } = await postCheckIn()
        const first = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)

        expect(await jobModel.holdsClaim(first!)).toBe(true)

        await jobModel.enqueueJob(res.body.data.id, userId)
        expect(await jobModel.holdsClaim(first!)).toBe(false)

        const second = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)
        expect(await jobModel.holdsClaim(second!)).toBe(true)

        await jobModel.claimNextJob(ALL_STALE_MS)
        expect(await jobModel.holdsClaim(second!)).toBe(false)
    })

    it('fails a stale job that used all its attempts instead of retrying it', async () => {
        await postCheckIn()
        await Prisma.checkInAiJob.updateMany({
            data: {
                status: 'RUNNING',
                attempts: CHECK_IN_AI_JOB_MAX_ATTEMPTS,
                lockedAt: new Date(0)
            }
        })

        expect(await jobModel.claimNextJob(ALL_STALE_MS)).toBeNull()

        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.status).toBe('FAILED')
    })

    it('drains the job and marks it done', async () => {
        await postCheckIn()

        expect(await drainJobs()).toBe(1)

        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.status).toBe('DONE')
        expect(insightGenerationService.generateInsightForCheckIn)
            .toHaveBeenCalledTimes(1)
    })

    it('retries a failing job and gives up after the last attempt', async () => {
        await postCheckIn()
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockRejectedValue(new Error('boom'))

        await drainJobs()

        const retrying = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(retrying.status).toBe('PENDING')
        expect(retrying.attempts).toBe(1)

        await Prisma.checkInAiJob.updateMany({
            data: { runAfter: new Date(Date.now() - secondInMs) }
        })
        await drainJobs()

        const job = await Prisma.checkInAiJob.findFirstOrThrow()
        expect(job.status).toBe('FAILED')
        expect(job.attempts).toBe(CHECK_IN_AI_JOB_MAX_ATTEMPTS)
        expect(job.lastError).toBe('Error')
    })

    describe('requeueMissedJobs', () => {
        it('inserts a pending job for a recent check-in that has none', async () => {
            const { res, userId } = await postCheckIn()
            await Prisma.checkInAiJob.deleteMany()

            await sweep()

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.checkInId).toBe(res.body.data.id)
            expect(job.userId).toBe(userId)
            expect(job.status).toBe('PENDING')
            expect(job.attempts).toBe(0)
            expect(await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS))
                .not.toBeNull()
        })

        it('does not add a second job for a check-in that has one', async () => {
            await postCheckIn()

            await sweep()
            await sweep()

            expect(await Prisma.checkInAiJob.count()).toBe(1)
        })

        it('re-queues a failed job whose last update is past the retry window', async () => {
            const { res } = await postCheckIn()
            await failJob(res.body.data.id, PAST_RETRY_WINDOW_MS)

            await sweep()

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe('PENDING')
            expect(job.attempts).toBe(0)
            expect(job.lockedAt).toBeNull()
            expect(job.lastError).toBeNull()
            expect((await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS))!.attempts)
                .toBe(1)
        })

        it('leaves a failed job alone while it is inside the retry window', async () => {
            const { res } = await postCheckIn()
            await failJob(res.body.data.id, minuteInMs)

            await sweep()

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe('FAILED')
            expect(job.attempts).toBe(CHECK_IN_AI_JOB_MAX_ATTEMPTS)
        })

        it.each([
            'PENDING',
            'RUNNING',
            'DONE'
        ] as const)('leaves a %s job untouched', async (status) => {
            const { res } = await postCheckIn()
            await Prisma.checkInAiJob.update({
                where: { checkInId: res.body.data.id },
                data: { status, attempts: 1 }
            })
            await ageJobUpdate(res.body.data.id, PAST_RETRY_WINDOW_MS)

            await sweep()

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe(status)
            expect(job.attempts).toBe(1)
        })

        it('ignores a check-in older than the lookback, with or without a job', async () => {
            const { res } = await postCheckIn()
            await ageCheckIn(
                res.body.data.id,
                CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS + hourInMs
            )
            await failJob(res.body.data.id, PAST_RETRY_WINDOW_MS)

            await sweep()
            expect((await Prisma.checkInAiJob.findFirstOrThrow()).status)
                .toBe('FAILED')

            await Prisma.checkInAiJob.deleteMany()
            await sweep()
            expect(await Prisma.checkInAiJob.count()).toBe(0)
        })

        it('stamps a job failed as stale so the retry window starts then', async () => {
            await postCheckIn()
            await Prisma.checkInAiJob.updateMany({
                data: {
                    status: 'RUNNING',
                    attempts: CHECK_IN_AI_JOB_MAX_ATTEMPTS,
                    lockedAt: new Date(0)
                }
            })
            await Prisma.$executeRaw`
                UPDATE "CheckInAiJob"
                SET "updatedAt" = now() - ${PAST_RETRY_WINDOW_MS} * interval '1 millisecond'
            `

            await jobModel.claimNextJob(ALL_STALE_MS)
            await sweep()

            const job = await Prisma.checkInAiJob.findFirstOrThrow()
            expect(job.status).toBe('FAILED')
            expect(job.lastError).toBe('Stale')
            expect(Date.now() - job.updatedAt.getTime())
                .toBeLessThan(CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS)
        })
    })
})
