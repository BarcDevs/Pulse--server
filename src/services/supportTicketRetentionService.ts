import {
    supportTicketClosedRetentionMs,
    supportTicketOpenRetentionMs
} from '../constants/support/supportTickets'
import { dayInMs } from '../constants/time'
import { deleteTicketsExpiredBefore } from '../models/supportTicketModel'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

// A CLOSED ticket goes 6 months after it was closed, a ticket never closed
// 24 months after it was created. Deleting the row drops the sender email and
// the user link, which is how a purged account's ticket is finally blanked
export const purgeExpiredSupportTickets = async (): Promise<number> => {
    const now = Date.now()

    const { count } = await deleteTicketsExpiredBefore(
        new Date(now - supportTicketClosedRetentionMs),
        new Date(now - supportTicketOpenRetentionMs)
    )

    if (count)
        logger.info(`Purged ${count} support tickets past retention`)

    return count
}

// Runs at startup and then daily, like the account purge
export const scheduleSupportTicketRetention = () => {
    const run = () =>
        purgeExpiredSupportTickets().catch((error: unknown) =>
            logger.error(
                'Support ticket retention failed',
                toLoggableError(error)
            )
        )

    void run()

    setInterval(run, dayInMs).unref()
}
