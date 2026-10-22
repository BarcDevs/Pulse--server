import {
    supportTicketClosedRetentionMs,
    supportTicketOpenRetentionMs
} from '../constants/support/supportTickets'
import { deleteTicketsExpiredBefore } from '../models/supportTicketModel'
import logger from '../utils/logger'
import { scheduleDailyJob } from '../utils/scheduleDailyJob'

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

export const scheduleSupportTicketRetention = () =>
    scheduleDailyJob(
        'Support ticket retention failed',
        purgeExpiredSupportTickets
    )
