import { dayInMs } from '../../constants/time'
import logger from '../../utils/logger'
import { scheduleDailyJob } from '../../utils/scheduleDailyJob'

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn()
    }
}))

const failureMessage = 'Job failed'

describe('scheduleDailyJob', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('runs the job at startup', () => {
        const job = jest.fn().mockResolvedValue(0)

        scheduleDailyJob(failureMessage, job)

        expect(job).toHaveBeenCalledTimes(1)
    })

    it('runs the job again after one day', async () => {
        const job = jest.fn().mockResolvedValue(0)

        scheduleDailyJob(failureMessage, job)
        await jest.advanceTimersByTimeAsync(dayInMs)

        expect(job).toHaveBeenCalledTimes(2)
    })

    it('keeps running after a failed run', async () => {
        const job = jest.fn()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValue(0)

        scheduleDailyJob(failureMessage, job)
        await jest.advanceTimersByTimeAsync(dayInMs)

        expect(job).toHaveBeenCalledTimes(2)
    })

    it('logs the failure with the failure message', async () => {
        const job = jest.fn().mockRejectedValue(new Error('boom'))

        scheduleDailyJob(failureMessage, job)
        await jest.advanceTimersByTimeAsync(0)

        expect(logger.error).toHaveBeenCalledWith(
            failureMessage,
            expect.objectContaining({ name: 'Error' })
        )
    })
})
