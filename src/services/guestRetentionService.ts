import ms, { type StringValue } from 'ms'

import { authConfig } from '../../config'
import {
    GUEST_PURGE_BATCH_SIZE,
    GUEST_RETENTION_GRACE_DAYS
} from '../constants/auth/authRules'
import { dayInMs } from '../constants/time'
import { deleteStaleGuests } from '../models/authModel'
import logger from '../utils/logger'
import { scheduleDailyJob } from '../utils/scheduleDailyJob'

// A guest token is never extended while the guest is reused, so a guest older
// than the token lifetime can no longer sign in. An upgraded account has
// isGuest false, so only abandoned guests are deleted
export const guestRetentionMs =
    ms(authConfig.expiresIn as unknown as StringValue)
    + GUEST_RETENTION_GRACE_DAYS * dayInMs

export const purgeStaleGuests = async (): Promise<number> => {
    const count = await deleteStaleGuests(
        new Date(Date.now() - guestRetentionMs),
        GUEST_PURGE_BATCH_SIZE
    )

    if (count)
        logger.info(`Purged ${count} stale guests`)

    return count
}

export const scheduleGuestPurge = () =>
    scheduleDailyJob(
        'Stale guest purge failed',
        purgeStaleGuests
    )
