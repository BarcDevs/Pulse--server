import ms, { type StringValue } from 'ms'

import { authConfig } from '../../../config'
import { GUEST_PURGE_BATCH_SIZE } from '../../constants/auth/authRules'
import { dayInMs } from '../../constants/time'
import {
    guestRetentionMs,
    purgeStaleGuests,
    scheduleGuestPurge
} from '../../services/guestRetentionService'
import { prismaMock } from '../setup/jestSetup'

describe('guestRetentionService', () => {
    describe('guestRetentionMs', () => {
        it('is the guest token lifetime plus one day, so an active guest is never purged', () => {
            const tokenLifetime = ms(authConfig.expiresIn as unknown as StringValue)

            expect(guestRetentionMs).toBe(tokenLifetime + dayInMs)
        })
    })

    describe('purgeStaleGuests', () => {
        it('deletes only guests older than the retention window', async () => {
            prismaMock.user.findMany
                .mockResolvedValue([{ id: 'a' }, { id: 'b' }] as never)
            prismaMock.user.deleteMany.mockResolvedValue({ count: 2 })
            const before = Date.now()

            const count = await purgeStaleGuests()
            const after = Date.now()

            const { where } = prismaMock.user.findMany.mock.calls[0][0]!
            const cutoff = (where!.createdAt as { lt: Date }).lt.getTime()

            expect(count).toBe(2)
            expect(where!.isGuest).toBe(true)
            // The cutoff is "now minus the retention", with "now" read inside
            // the call: it lies in the window between the two clock reads
            expect(cutoff).toBeGreaterThanOrEqual(before - guestRetentionMs)
            expect(cutoff).toBeLessThanOrEqual(after - guestRetentionMs)
            expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: { in: ['a', 'b'] },
                    isGuest: true
                }
            })
        })

        it('keeps going in batches until a short batch comes back', async () => {
            const full = Array.from(
                { length: GUEST_PURGE_BATCH_SIZE },
                (_, index) => ({ id: `g${index}` })
            )
            prismaMock.user.findMany
                .mockResolvedValueOnce(full as never)
                .mockResolvedValueOnce([{ id: 'last' }] as never)
            prismaMock.user.deleteMany
                .mockResolvedValueOnce({ count: GUEST_PURGE_BATCH_SIZE })
                .mockResolvedValueOnce({ count: 1 })

            const count = await purgeStaleGuests()

            expect(count).toBe(GUEST_PURGE_BATCH_SIZE + 1)
            expect(prismaMock.user.findMany).toHaveBeenCalledTimes(2)
        })

        it('deletes nothing, and does not even issue a delete, when there are no stale guests', async () => {
            prismaMock.user.findMany.mockResolvedValue([])

            expect(await purgeStaleGuests()).toBe(0)
            expect(prismaMock.user.deleteMany).not.toHaveBeenCalled()
        })
    })

    describe('scheduleGuestPurge', () => {
        beforeEach(() => jest.useFakeTimers())
        afterEach(() => jest.useRealTimers())

        it('runs at startup and then once a day', async () => {
            prismaMock.user.findMany.mockResolvedValue([])
            prismaMock.user.deleteMany.mockResolvedValue({ count: 0 })

            scheduleGuestPurge()
            expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1)

            await jest.advanceTimersByTimeAsync(dayInMs)
            expect(prismaMock.user.findMany).toHaveBeenCalledTimes(2)
        })
    })
})
