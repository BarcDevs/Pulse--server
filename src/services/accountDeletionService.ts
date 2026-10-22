import { ACCOUNT_DELETION_GRACE_DAYS } from '../constants/auth/authRules'
import { dayInMs } from '../constants/time'
import { deleteAccountsDeletedBefore } from '../models/accountDeletionModel'
import logger from '../utils/logger'
import { scheduleDailyJob } from '../utils/scheduleDailyJob'

export const purgeExpiredAccounts = async (): Promise<number> => {
    const cutoff = new Date(
        Date.now() - ACCOUNT_DELETION_GRACE_DAYS * dayInMs
    )

    const { count } = await deleteAccountsDeletedBefore(cutoff)

    if (count)
        logger.info(`Purged ${count} accounts past the deletion grace period`)

    return count
}

export const scheduleAccountPurge = () =>
    scheduleDailyJob('Account purge failed', purgeExpiredAccounts)
