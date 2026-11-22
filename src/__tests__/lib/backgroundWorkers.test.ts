import { appConfig } from '../../../config'
import { startBackgroundWorkers } from '../../lib/backgroundWorkers'
import { scheduleAccountPurge } from '../../services/accountDeletionService'
import { startCheckInAiWorker } from '../../services/checkInAiWorkerService'
import { scheduleGuestPurge } from '../../services/guestRetentionService'
import { scheduleSupportTicketRetention } from '../../services/supportTicketRetentionService'

jest.mock('../../services/accountDeletionService')
jest.mock('../../services/checkInAiWorkerService')
jest.mock('../../services/guestRetentionService')
jest.mock('../../services/supportTicketRetentionService')

describe('startBackgroundWorkers', () => {
    const originalWorkersEnabled = appConfig.workersEnabled

    afterEach(() => {
        appConfig.workersEnabled = originalWorkersEnabled
        jest.clearAllMocks()
    })

    it('starts the worker and the schedulers when workers are enabled', () => {
        const stopWorker = jest.fn().mockResolvedValue(undefined)

        appConfig.workersEnabled = true
        jest.mocked(startCheckInAiWorker).mockReturnValue(stopWorker)

        const stop = startBackgroundWorkers()

        expect(scheduleAccountPurge).toHaveBeenCalledTimes(1)
        expect(scheduleGuestPurge).toHaveBeenCalledTimes(1)
        expect(scheduleSupportTicketRetention).toHaveBeenCalledTimes(1)
        expect(startCheckInAiWorker).toHaveBeenCalledTimes(1)
        expect(stop).toBe(stopWorker)
    })

    it('starts nothing when workers are disabled, and stop resolves', async () => {
        appConfig.workersEnabled = false

        const stop = startBackgroundWorkers()

        expect(scheduleAccountPurge).not.toHaveBeenCalled()
        expect(scheduleGuestPurge).not.toHaveBeenCalled()
        expect(scheduleSupportTicketRetention).not.toHaveBeenCalled()
        expect(startCheckInAiWorker).not.toHaveBeenCalled()
        await expect(stop()).resolves.toBeUndefined()
    })
})
