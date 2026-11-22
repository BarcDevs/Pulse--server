import { isBrokerConfigured } from '../../lib/queue/broker'
import { publishJob } from '../../lib/queue/publisher'
import * as jobModel from '../../models/checkInAiJobModel'
import {
    handleJobMessage,
    isBrokerBackend,
    logQueueStats,
    publishJobById,
    sweepUnpublishedJobs,
    tryPublishJob
} from '../../services/checkInAiQueueService'
import { runJob } from '../../services/checkInAiWorkerService'
import logger from '../../utils/logger'

const mockConfig = {
    jobsConfig: { backend: 'rabbitmq', consumerConcurrency: 2 },
    rabbitMqConfig: { publishTimeoutMs: 1000, reconnectDelayMs: 10 }
}

jest.mock('../../../config', () => ({
    get jobsConfig() {
        return mockConfig.jobsConfig
    },
    get rabbitMqConfig() {
        return mockConfig.rabbitMqConfig
    }
}))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))
jest.mock('../../lib/queue/broker', () => ({
    createConsumerChannel: jest.fn(),
    getConfirmChannel: jest.fn(),
    isBrokerConfigured: jest.fn(() => true)
}))
jest.mock('../../lib/queue/publisher', () => ({
    publishJob: jest.fn()
}))
jest.mock('../../models/checkInAiJobModel')
jest.mock('../../services/checkInAiWorkerService', () => ({
    runJob: jest.fn()
}))

const model = jobModel as jest.Mocked<typeof jobModel>
const publish = publishJob as jest.Mock
const run = runJob as jest.Mock

describe('checkInAiQueueService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockConfig.jobsConfig.backend = 'rabbitmq'
        ;(isBrokerConfigured as jest.Mock).mockReturnValue(true)
    })

    describe('isBrokerBackend', () => {
        it('is on only when the backend is rabbitmq and a broker is configured', () => {
            expect(isBrokerBackend()).toBe(true)

            mockConfig.jobsConfig.backend = 'postgres'
            expect(isBrokerBackend()).toBe(false)

            mockConfig.jobsConfig.backend = 'rabbitmq'
            ;(isBrokerConfigured as jest.Mock).mockReturnValue(false)
            expect(isBrokerBackend()).toBe(false)
        })
    })

    describe('publishing after a check-in is saved', () => {
        it('marks the row published only after the broker confirmed', async () => {
            publish.mockResolvedValue(undefined)

            await publishJobById('job-1')

            expect(publish).toHaveBeenCalledWith(expect.any(Function), 'checkin-ai', 'job-1', 1000)
            expect(model.markJobPublished).toHaveBeenCalledWith('job-1')
        })

        it('leaves the row unpublished and does not throw when the broker does not confirm', async () => {
            publish.mockRejectedValue(new Error('No broker confirmation within 1000 ms'))

            await expect(tryPublishJob('job-1')).resolves.toBeUndefined()

            expect(model.markJobPublished).not.toHaveBeenCalled()
            expect(logger.warn).toHaveBeenCalledWith(
                'Check-in AI job not published, the sweeper will retry',
                expect.objectContaining({ jobId: 'job-1' })
            )
        })
    })

    describe('handleJobMessage', () => {
        it('does nothing for a job that is gone, done or held by a live claim', async () => {
            model.claimJobById.mockResolvedValue(null)

            const outcome = await handleJobMessage('job-1')

            expect(outcome).toBe('done')
            expect(run).not.toHaveBeenCalled()
        })

        it('runs the claimed job and returns how it ended', async () => {
            const job = { id: 'job-1', checkInId: 'c1', userId: 'u1', attempts: 1, lockedAt: new Date() }
            model.claimJobById.mockResolvedValue(job)
            run.mockResolvedValue('retry')

            const outcome = await handleJobMessage('job-1')

            expect(run).toHaveBeenCalledWith(job)
            expect(outcome).toBe('retry')
        })

        it('answers a duplicate message for the same job only once with work', async () => {
            const job = { id: 'job-1', checkInId: 'c1', userId: 'u1', attempts: 1, lockedAt: new Date() }
            model.claimJobById.mockResolvedValueOnce(job).mockResolvedValueOnce(null)
            run.mockResolvedValue('done')

            await handleJobMessage('job-1')
            await handleJobMessage('job-1')

            expect(run).toHaveBeenCalledTimes(1)
        })
    })

    describe('sweepUnpublishedJobs', () => {
        it('publishes every waiting row the model returns', async () => {
            model.findJobIdsToPublish.mockResolvedValue(['a', 'b'])
            publish.mockResolvedValue(undefined)

            const published = await sweepUnpublishedJobs()

            expect(published).toBe(2)
            expect(model.markJobPublished).toHaveBeenCalledTimes(2)
        })

        it('stops at the first failure so a dead broker is not hammered', async () => {
            model.findJobIdsToPublish.mockResolvedValue(['a', 'b', 'c'])
            publish.mockRejectedValue(new Error('connect ECONNREFUSED'))

            const published = await sweepUnpublishedJobs()

            expect(published).toBe(0)
            expect(publish).toHaveBeenCalledTimes(1)
        })
    })

    describe('logQueueStats', () => {
        it('logs the queue depth and the age of the oldest job and nothing about content', async () => {
            model.getQueueStats.mockResolvedValue({ waiting: 4, oldestWaitingSeconds: 37 })

            await logQueueStats()

            expect(logger.info).toHaveBeenCalledWith('Check-in AI queue', {
                waiting: 4,
                oldestWaitingSeconds: 37
            })
        })
    })
})
