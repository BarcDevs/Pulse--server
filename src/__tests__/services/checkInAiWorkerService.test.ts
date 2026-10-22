import {
    CHECK_IN_AI_JOB_MAX_ATTEMPTS,
    CHECK_IN_AI_JOB_STALE_MS
} from '../../constants/checkInAiJob'
import * as jobModel from '../../models/checkInAiJobModel'
import { drainJobs, startCheckInAiWorker } from '../../services/checkInAiWorkerService'
import * as insightGenerationService from '../../services/insightGenerationService'
import * as recommendationsService from '../../services/recommendationsService'

jest.mock('../../models/checkInAiJobModel')
jest.mock('../../services/insightGenerationService')
jest.mock('../../services/recommendationsService')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const job = (attempts = 1) => ({
    id: 'job-1',
    checkInId: 'check-in-1',
    userId: 'user-1',
    attempts,
    lockedAt: new Date('2026-10-11T10:00:00Z')
})

describe('checkInAiWorker', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockResolvedValue(undefined)
        jest.spyOn(recommendationsService, 'generateRecommendationsSafely')
            .mockResolvedValue(undefined)
    })

    it('runs insight then recommendations and marks the job done', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job())
            .mockResolvedValueOnce(null)

        const processed = await drainJobs()

        expect(processed).toBe(1)
        expect(insightGenerationService.generateInsightForCheckIn)
            .toHaveBeenCalledWith('user-1', 'check-in-1', expect.any(Function))
        expect(recommendationsService.generateRecommendationsSafely)
            .toHaveBeenCalledWith('user-1', 'check-in-1', expect.any(Function))
        expect(jobModel.markJobDone).toHaveBeenCalledWith(job())
    })

    it('passes the stale window to the claim, leaving the cutoff to the database clock', async () => {
        jest.spyOn(jobModel, 'claimNextJob').mockResolvedValue(null)

        await drainJobs()

        expect(jobModel.claimNextJob)
            .toHaveBeenCalledWith(CHECK_IN_AI_JOB_STALE_MS)
    })

    it('lets the generators ask whether the job still holds its claim', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job())
            .mockResolvedValueOnce(null)
        jest.spyOn(jobModel, 'holdsClaim').mockResolvedValue(false)

        await drainJobs()

        const [, , canWrite] = jest.mocked(
            insightGenerationService.generateInsightForCheckIn
        ).mock.calls[0]
        expect(await canWrite?.()).toBe(false)
        expect(jobModel.holdsClaim).toHaveBeenCalledWith(job())
    })

    it('does nothing when no job is claimable', async () => {
        jest.spyOn(jobModel, 'claimNextJob').mockResolvedValue(null)

        expect(await drainJobs()).toBe(0)
        expect(insightGenerationService.generateInsightForCheckIn)
            .not.toHaveBeenCalled()
    })

    it('puts the job back to pending when it fails before the last attempt', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job(1))
            .mockResolvedValueOnce(null)
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockRejectedValue(new Error('db down'))

        await drainJobs()

        expect(jobModel.markJobRetry).toHaveBeenCalledWith(job(1), 'Error')
        expect(jobModel.markJobFailed).not.toHaveBeenCalled()
        expect(jobModel.markJobDone).not.toHaveBeenCalled()
        expect(recommendationsService.generateRecommendationsSafely)
            .not.toHaveBeenCalled()
    })

    it('marks the job failed once the attempts are used up', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job(CHECK_IN_AI_JOB_MAX_ATTEMPTS))
            .mockResolvedValueOnce(null)
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockRejectedValue(new Error('db down'))

        await drainJobs()

        expect(jobModel.markJobFailed).toHaveBeenCalledWith(job(CHECK_IN_AI_JOB_MAX_ATTEMPTS), 'Error')
        expect(jobModel.markJobRetry).not.toHaveBeenCalled()
    })

    it('does not store the error message, only its kind', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job())
            .mockResolvedValueOnce(null)
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
            .mockRejectedValue(new Error('row with email a@b.com'))

        await drainJobs()

        expect(jobModel.markJobRetry).toHaveBeenCalledWith(job(1), 'Error')
    })

    it('stops claiming new jobs once told to stop', async () => {
        jest.spyOn(jobModel, 'claimNextJob').mockResolvedValue(job())

        expect(await drainJobs(() => true)).toBe(0)
        expect(jobModel.claimNextJob).not.toHaveBeenCalled()
    })

    it('keeps draining after the bookkeeping of one job fails', async () => {
        jest.spyOn(jobModel, 'claimNextJob')
            .mockResolvedValueOnce(job())
            .mockResolvedValueOnce(job())
            .mockResolvedValueOnce(null)
        jest.spyOn(jobModel, 'markJobDone')
            .mockRejectedValueOnce(new Error('db down'))
            .mockResolvedValueOnce(true)

        expect(await drainJobs()).toBe(2)
    })

    describe('startCheckInAiWorker', () => {
        beforeEach(() => jest.useFakeTimers())
        afterEach(() => jest.useRealTimers())

        it('waits for the job in flight when stopped, then claims no more', async () => {
            let finish: () => void = () => undefined
            jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
                .mockImplementation(() => new Promise<void>((resolve) => {
                    finish = resolve
                }))
            jest.spyOn(jobModel, 'claimNextJob')
                .mockResolvedValueOnce(job())
                .mockResolvedValue(null)

            const stop = startCheckInAiWorker()
            await jest.advanceTimersByTimeAsync(0)

            let stopped = false
            const stopping = stop().then(() => {
                stopped = true
            })
            await jest.advanceTimersByTimeAsync(0)
            expect(stopped).toBe(false)

            finish()
            await stopping

            expect(stopped).toBe(true)
            expect(jobModel.markJobDone).toHaveBeenCalledTimes(1)
            expect(jobModel.claimNextJob).toHaveBeenCalledTimes(2)
        })
    })
})
