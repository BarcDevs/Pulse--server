import { ACCOUNT_DELETION_GRACE_DAYS } from '../../constants/auth/authRules'
import { dayInMs } from '../../constants/time'
import {
    purgeExpiredAccounts,
    scheduleAccountPurge
} from '../../services/accountDeletionService'
import { prismaMock } from '../setup/jestSetup'

describe('accountDeletionService', () => {
    describe('purgeExpiredAccounts', () => {
        it('deletes only deactivated accounts past the grace period', async () => {
            prismaMock.user.deleteMany
                .mockResolvedValue({ count: 2 })
            const before = Date.now()

            const count = await purgeExpiredAccounts()

            expect(count).toBe(2)
            const { where } = prismaMock.user.deleteMany
                .mock.calls[0][0]!
            expect(where).toEqual({
                active: false,
                deletedAt: { lte: expect.any(Date) }
            })
            const cutoff = (where!.deletedAt as { lte: Date }).lte
            expect(before - cutoff.getTime())
                .toBeGreaterThanOrEqual(ACCOUNT_DELETION_GRACE_DAYS * dayInMs)
        })
    })

    describe('scheduleAccountPurge', () => {
        beforeEach(() => jest.useFakeTimers())
        afterEach(() => jest.useRealTimers())

        it('runs at startup and then once a day', async () => {
            prismaMock.user.deleteMany
                .mockResolvedValue({ count: 0 })

            scheduleAccountPurge()
            expect(prismaMock.user.deleteMany)
                .toHaveBeenCalledTimes(1)

            await jest.advanceTimersByTimeAsync(dayInMs)
            expect(prismaMock.user.deleteMany)
                .toHaveBeenCalledTimes(2)
        })

        it('keeps running after a failed purge', async () => {
            prismaMock.user.deleteMany
                .mockRejectedValueOnce(new Error('db down'))
                .mockResolvedValue({ count: 0 })

            scheduleAccountPurge()
            await jest.advanceTimersByTimeAsync(dayInMs)

            expect(prismaMock.user.deleteMany)
                .toHaveBeenCalledTimes(2)
        })
    })
})
