import { appConfig } from '../../config'
import { scheduleAccountPurge } from '../services/accountDeletionService'
import { isBrokerBackend, startCheckInAiConsumer } from '../services/checkInAiQueueService'
import { startCheckInAiWorker } from '../services/checkInAiWorkerService'
import { scheduleGuestPurge } from '../services/guestRetentionService'
import { scheduleSupportTicketRetention } from '../services/supportTicketRetentionService'
import logger from '../utils/logger'

// Starts the check-in AI worker and the purge schedulers, and returns the
// function that stops the worker. A deploy candidate runs with
// WORKERS_ENABLED=false so it never claims jobs while it is only being health
// checked, and the returned stop function then has nothing to wait for.
export const startBackgroundWorkers = (): (() => Promise<void>) => {
    if (!appConfig.workersEnabled) {
        logger.info('Background workers are off for this instance')

        return async () => {}
    }

    scheduleAccountPurge()
    scheduleGuestPurge()
    scheduleSupportTicketRetention()

    // One kind of worker at a time: the polling worker and the broker consumer
    // would both claim jobs
    if (isBrokerBackend()) {
        logger.info('Check-in AI jobs run through the broker')

        return startCheckInAiConsumer()
    }

    return startCheckInAiWorker()
}
