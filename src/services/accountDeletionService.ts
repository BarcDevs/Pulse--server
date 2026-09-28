import { ACCOUNT_DELETION_GRACE_DAYS } from '../constants/auth/authRules'
import { dayInMs } from '../constants/time'
import { deleteAccountsDeletedBefore } from '../models/accountDeletionModel'
import logger from '../utils/logger'

export const purgeExpiredAccounts = async (): Promise<number> => {
    const cutoff = new Date(
        Date.now() - ACCOUNT_DELETION_GRACE_DAYS * dayInMs
    )

    const { count } = await deleteAccountsDeletedBefore(cutoff)

    if (count)
        logger.info(`Purged ${count} accounts past the deletion grace period`)

    return count
}

// Runs at startup and then daily. A single instance serves the app, so an
// in-process timer is enough; a missed day is caught by the next run.
export const scheduleAccountPurge = () => {
    const run = () =>
        purgeExpiredAccounts().catch((error: unknown) =>
            logger.error('Account purge failed', error)
        )

    void run()

    setInterval(run, dayInMs).unref()
}
