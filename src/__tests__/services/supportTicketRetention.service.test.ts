import {
    supportTicketClosedRetentionMs,
    supportTicketOpenRetentionMs
} from '../../constants/support/supportTickets'
import { dayInMs } from '../../constants/time'
import {
    purgeExpiredSupportTickets,
    scheduleSupportTicketRetention
} from '../../services/supportTicketRetentionService'
import { prismaMock } from '../setup/jestSetup'

describe('supportTicketRetentionService', () => {
    describe('purgeExpiredSupportTickets', () => {
        it('deletes CLOSED tickets past 6 months and never-closed past 24 months', async () => {
            prismaMock.supportTicket.deleteMany
                .mockResolvedValue({ count: 3 })
            const before = Date.now()

            const count = await purgeExpiredSupportTickets()
            const after = Date.now()

            expect(count).toBe(3)
            const { where } = prismaMock.supportTicket.deleteMany
                .mock.calls[0][0]!
            expect(where).toEqual({
                OR: [
                    {
                        status: 'CLOSED',
                        closedAt: { lte: expect.any(Date) }
                    },
                    {
                        closedAt: null,
                        createdAt: { lte: expect.any(Date) }
                    }
                ]
            })

            const [closed, open] = where!.OR as [
                { closedAt: { lte: Date } },
                { createdAt: { lte: Date } }
            ]
            expect(closed.closedAt.lte.getTime())
                .toBeGreaterThanOrEqual(before - supportTicketClosedRetentionMs)
            expect(closed.closedAt.lte.getTime())
                .toBeLessThanOrEqual(after - supportTicketClosedRetentionMs)
            expect(open.createdAt.lte.getTime())
                .toBeGreaterThanOrEqual(before - supportTicketOpenRetentionMs)
            expect(open.createdAt.lte.getTime())
                .toBeLessThanOrEqual(after - supportTicketOpenRetentionMs)
        })

        it('returns 0 when nothing expired', async () => {
            prismaMock.supportTicket.deleteMany
                .mockResolvedValue({ count: 0 })

            expect(await purgeExpiredSupportTickets()).toBe(0)
        })
    })

    describe('scheduleSupportTicketRetention', () => {
        beforeEach(() => jest.useFakeTimers())
        afterEach(() => jest.useRealTimers())

        it('runs at startup and then once a day', async () => {
            prismaMock.supportTicket.deleteMany
                .mockResolvedValue({ count: 0 })

            scheduleSupportTicketRetention()
            expect(prismaMock.supportTicket.deleteMany)
                .toHaveBeenCalledTimes(1)

            await jest.advanceTimersByTimeAsync(dayInMs)
            expect(prismaMock.supportTicket.deleteMany)
                .toHaveBeenCalledTimes(2)
        })

        it('keeps running after a failed run', async () => {
            prismaMock.supportTicket.deleteMany
                .mockRejectedValueOnce(new Error('db down'))
                .mockResolvedValue({ count: 0 })

            scheduleSupportTicketRetention()
            await jest.advanceTimersByTimeAsync(dayInMs)

            expect(prismaMock.supportTicket.deleteMany)
                .toHaveBeenCalledTimes(2)
        })
    })
})
