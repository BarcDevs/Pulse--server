import * as aiInsightModel from '../../models/aiInsightModel'
import { prismaMock } from '../setup/jestSetup'

const mockInsight = {
    id: 'insight-id',
    userId: 'user-1',
    checkInId: 'checkin-1',
    type: 'motivational',
    classification: 'baseline',
    priority: 'normal',
    title: 'Keep going',
    content: 'You are doing great.',
    metadata: null,
    createdAt: new Date('2026-01-01')
}

const baseInput = {
    userId: 'user-1',
    checkInId: 'checkin-1',
    insightType: 'motivational' as const,
    title: 'Keep going',
    content: 'You are doing great.'
}

describe('aiInsightModel', () => {
    describe('createInsight', () => {
        it('upserts and returns the insight', async () => {
            prismaMock.aIInsight.upsert.mockResolvedValue(mockInsight as never)

            const result = await aiInsightModel.createInsight(baseInput as never)

            expect(prismaMock.aIInsight.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        checkInId_type: {
                            checkInId: 'checkin-1',
                            type: 'motivational'
                        }
                    }
                })
            )
            expect(result).toEqual(mockInsight)
        })

        it('applies default classification=baseline and priority=normal', async () => {
            prismaMock.aIInsight.upsert.mockResolvedValue(mockInsight as never)

            await aiInsightModel.createInsight(baseInput as never)

            const call = prismaMock.aIInsight.upsert.mock.calls[0][0]
            expect(call.create.classification).toBe('baseline')
            expect(call.create.priority).toBe('normal')
        })

        it('uses provided classification and priority', async () => {
            prismaMock.aIInsight.upsert.mockResolvedValue({
                ...mockInsight,
                classification: 'intervention',
                priority: 'high'
            } as never)

            await aiInsightModel.createInsight({
                ...baseInput,
                classification: 'intervention',
                priority: 'high'
            } as never)

            const call = prismaMock.aIInsight.upsert.mock.calls[0][0]
            expect(call.create.classification).toBe('intervention')
            expect(call.create.priority).toBe('high')
        })

        it('includes metadata in create/update when provided', async () => {
            const meta = { currentStreak: 3 }
            prismaMock.aIInsight.upsert.mockResolvedValue({
                ...mockInsight,
                metadata: meta
            } as never)

            await aiInsightModel.createInsight({ ...baseInput, metadata: meta } as never)

            const call = prismaMock.aIInsight.upsert.mock.calls[0][0]
            expect(call.create.metadata).toEqual(meta)
            expect(call.update.metadata).toEqual(meta)
        })

        it('omits metadata key when not provided', async () => {
            prismaMock.aIInsight.upsert.mockResolvedValue(mockInsight as never)

            await aiInsightModel.createInsight(baseInput as never)

            const call = prismaMock.aIInsight.upsert.mock.calls[0][0]
            expect(call.create).not.toHaveProperty('metadata')
            expect(call.update).not.toHaveProperty('metadata')
        })

        it('propagates Prisma error', async () => {
            prismaMock.aIInsight.upsert.mockRejectedValue(new Error('DB error'))

            await expect(
                aiInsightModel.createInsight(baseInput as never)
            ).rejects.toThrow('DB error')
        })

        it('propagates P2002 constraint violation', async () => {
            const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
            prismaMock.aIInsight.upsert.mockRejectedValue(err)

            await expect(
                aiInsightModel.createInsight(baseInput as never)
            ).rejects.toMatchObject({ code: 'P2002' })
        })
    })

    describe('deleteInsightsExceptTypes', () => {
        it('deletes only this check-in\'s insights whose type is not kept', async () => {
            prismaMock.aIInsight.deleteMany.mockResolvedValue({ count: 1 } as never)

            await aiInsightModel.deleteInsightsExceptTypes(
                'checkin-1',
                ['MOTIVATIONAL'] as never
            )

            expect(prismaMock.aIInsight.deleteMany).toHaveBeenCalledWith({
                where: {
                    checkInId: 'checkin-1',
                    type: { notIn: ['MOTIVATIONAL'] }
                }
            })
        })

        it('propagates Prisma error', async () => {
            prismaMock.aIInsight.deleteMany.mockRejectedValue(new Error('DB down'))

            await expect(
                aiInsightModel.deleteInsightsExceptTypes('checkin-1', [])
            ).rejects.toThrow('DB down')
        })
    })

    describe('getInsightsByUserId', () => {
        it('returns insights ordered by createdAt desc', async () => {
            const insights = [mockInsight, { ...mockInsight, id: 'insight-2' }]
            prismaMock.aIInsight.findMany.mockResolvedValue(insights as never)

            const result = await aiInsightModel.getInsightsByUserId('user-1')

            expect(prismaMock.aIInsight.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                orderBy: { createdAt: 'desc' },
                take: 10
            })
            expect(result).toEqual(insights)
        })

        it('uses custom limit', async () => {
            prismaMock.aIInsight.findMany.mockResolvedValue([mockInsight] as never)

            await aiInsightModel.getInsightsByUserId('user-1', 5)

            expect(prismaMock.aIInsight.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5 })
            )
        })

        it('returns empty array when no insights', async () => {
            prismaMock.aIInsight.findMany.mockResolvedValue([])

            const result = await aiInsightModel.getInsightsByUserId('user-1')

            expect(result).toEqual([])
        })

        it('propagates Prisma error', async () => {
            prismaMock.aIInsight.findMany.mockRejectedValue(new Error('DB down'))

            await expect(
                aiInsightModel.getInsightsByUserId('user-1')
            ).rejects.toThrow('DB down')
        })
    })

    describe('getInsightByCheckInId', () => {
        it('returns insight when found', async () => {
            prismaMock.aIInsight.findFirst.mockResolvedValue(mockInsight as never)

            const result = await aiInsightModel.getInsightByCheckInId('checkin-1')

            expect(prismaMock.aIInsight.findFirst).toHaveBeenCalledWith({
                where: { checkInId: 'checkin-1' },
                orderBy: { createdAt: 'desc' }
            })
            expect(result).toEqual(mockInsight)
        })

        it('returns null when not found', async () => {
            prismaMock.aIInsight.findFirst.mockResolvedValue(null)

            const result = await aiInsightModel.getInsightByCheckInId('checkin-1')

            expect(result).toBeNull()
        })

        it('propagates Prisma error', async () => {
            prismaMock.aIInsight.findFirst.mockRejectedValue(new Error('Timeout'))

            await expect(
                aiInsightModel.getInsightByCheckInId('checkin-1')
            ).rejects.toThrow('Timeout')
        })
    })
})
