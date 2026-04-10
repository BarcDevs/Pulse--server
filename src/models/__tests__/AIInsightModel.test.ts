import type { AIInsight } from '../../../prisma/generated/prisma/client'
import type { InsightType } from '../../../prisma/generated/prisma/enums'
import { prismaMock } from '../../__tests__/setup/jestSetup'
import * as aiInsightModel from '../AIInsightModel'

const createMockInsight = (
    overrides?: Record<string, unknown>
): AIInsight => ({
    id: 'mock-insight-id',
    userId: 'mock-user-id',
    checkInId: 'mock-check-in-id',
    type: 'MOTIVATIONAL' as InsightType,
    title: 'Test Insight',
    content: 'This is test content',
    metadata: null,
    createdAt: new Date(),
    ...overrides
})

describe('AIInsightModel', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createInsight', () => {
        it('should create an insight with all fields', async () => {
            const mockInsight = createMockInsight()
            prismaMock.aIInsight.upsert.mockResolvedValue(
                mockInsight
            )

            const result = await aiInsightModel.createInsight({
                userId: 'mock-user-id',
                checkInId: 'mock-check-in-id',
                insightType: 'MOTIVATIONAL',
                title: 'Test Insight',
                content: 'This is test content'
            })

            expect(result).toEqual(mockInsight)
            expect(prismaMock.aIInsight.upsert)
                .toHaveBeenCalledWith({
                    where: {
                        checkInId_type: {
                            checkInId: 'mock-check-in-id',
                            type: 'MOTIVATIONAL'
                        }
                    },
                    create: {
                        userId: 'mock-user-id',
                        checkInId: 'mock-check-in-id',
                        type: 'MOTIVATIONAL',
                        title: 'Test Insight',
                        content: 'This is test content'
                    },
                    update: {
                        title: 'Test Insight',
                        content: 'This is test content'
                    }
                })
        })

        it('should create insight with metadata', async () => {
            const metadata = {
                currentStreak: 5,
                checkInCount: 7
            }
            const mockInsight = createMockInsight({
                metadata
            })
            prismaMock.aIInsight.upsert.mockResolvedValue(
                mockInsight
            )

            const result = await aiInsightModel.createInsight({
                userId: 'mock-user-id',
                checkInId: 'mock-check-in-id',
                insightType: 'WEEKLY_SUMMARY',
                title: 'Weekly Summary',
                content: 'Summary content',
                metadata
            })

            expect(result.metadata).toEqual(metadata)
            expect(prismaMock.aIInsight.upsert)
                .toHaveBeenCalledWith(
                    expect.objectContaining({
                        create: expect.objectContaining({
                            metadata
                        }),
                        update: expect.objectContaining({
                            metadata
                        })
                    })
                )
        })

        it('should handle all insight types', async () => {
            const types: Array<
                'MOOD_DROP_ALERT' |
                'MOTIVATIONAL' |
                'WEEKLY_SUMMARY'
            > = [
                'MOOD_DROP_ALERT',
                'MOTIVATIONAL',
                'WEEKLY_SUMMARY'
            ]

            for (const type of types) {
                const mockInsight = createMockInsight({
                    type
                })
                prismaMock.aIInsight.upsert.mockResolvedValue(
                    mockInsight
                )

                const result = await aiInsightModel.createInsight({
                    userId: 'mock-user-id',
                    checkInId: 'mock-check-in-id',
                    insightType: type,
                    title: `${type} Insight`,
                    content: 'Content'
                })

                expect(result.type).toBe(type)
            }
        })

        it(
            'calling createInsight twice with same (checkInId, type) returns same row',
            async () => {
                const input = {
                    userId: 'mock-user-id',
                    checkInId: 'check-in-123',
                    insightType: 'MOOD_DROP_ALERT' as const,
                    title: 'Mood Drop',
                    content: 'Your mood is dropping'
                }

                const existingRow = createMockInsight({
                    id: 'insight-single',
                    checkInId: 'check-in-123',
                    type: 'MOOD_DROP_ALERT'
                })

                // Both calls return the same row (no duplicate)
                prismaMock.aIInsight.upsert
                    .mockResolvedValueOnce(existingRow)
                    .mockResolvedValueOnce(existingRow)

                const first = await aiInsightModel.createInsight(input)
                const second = await aiInsightModel.createInsight(input)

                // Critical: same ID = only 1 row in DB
                expect(first.id).toBe('insight-single')
                expect(second.id).toBe('insight-single')
                expect(first).toEqual(second)

                // Verify both used upsert with same composite key
                const calls = prismaMock.aIInsight.upsert.mock.calls
                expect(calls).toHaveLength(2)
                expect(calls[0][0].where.checkInId_type).toEqual({
                    checkInId: 'check-in-123',
                    type: 'MOOD_DROP_ALERT'
                })
                expect(calls[1][0].where.checkInId_type).toEqual({
                    checkInId: 'check-in-123',
                    type: 'MOOD_DROP_ALERT'
                })
            }
        )

        it(
            'repeated calls with same (checkInId, type) do not create duplicates',
            async () => {
                const input = {
                    userId: 'mock-user-id',
                    checkInId: 'check-in-abc',
                    insightType: 'MOTIVATIONAL' as const,
                    title: 'Stay Motivated',
                    content: 'You are doing great'
                }

                const singleRow = createMockInsight({
                    id: 'row-persistent',
                    checkInId: 'check-in-abc',
                    type: 'MOTIVATIONAL'
                })

                prismaMock.aIInsight.upsert.mockResolvedValue(singleRow)

                // Call 5 times
                const results = await Promise.all([
                    aiInsightModel.createInsight(input),
                    aiInsightModel.createInsight(input),
                    aiInsightModel.createInsight(input),
                    aiInsightModel.createInsight(input),
                    aiInsightModel.createInsight(input)
                ])

                // All return same ID (1 row, not 5)
                const uniqueIds = new Set(
                    results.map((r) => r.id)
                )
                expect(uniqueIds.size).toBe(1)
                expect(uniqueIds.has('row-persistent')).toBe(true)
            }
        )

        it(
            'different types for same checkInId create separate rows',
            async () => {
                const checkInId = 'check-in-multi'

                const row1 = createMockInsight({
                    id: 'row-mood',
                    checkInId,
                    type: 'MOOD_DROP_ALERT'
                })
                const row2 = createMockInsight({
                    id: 'row-motiv',
                    checkInId,
                    type: 'MOTIVATIONAL'
                })
                const row3 = createMockInsight({
                    id: 'row-weekly',
                    checkInId,
                    type: 'WEEKLY_SUMMARY'
                })

                prismaMock.aIInsight.upsert
                    .mockResolvedValueOnce(row1)
                    .mockResolvedValueOnce(row2)
                    .mockResolvedValueOnce(row3)

                const result1 = await aiInsightModel.createInsight({
                    userId: 'mock-user-id',
                    checkInId,
                    insightType: 'MOOD_DROP_ALERT',
                    title: 'Mood',
                    content: 'content'
                })

                const result2 = await aiInsightModel.createInsight({
                    userId: 'mock-user-id',
                    checkInId,
                    insightType: 'MOTIVATIONAL',
                    title: 'Motiv',
                    content: 'content'
                })

                const result3 = await aiInsightModel.createInsight({
                    userId: 'mock-user-id',
                    checkInId,
                    insightType: 'WEEKLY_SUMMARY',
                    title: 'Weekly',
                    content: 'content'
                })

                // Different types = different rows
                expect(result1.id).toBe('row-mood')
                expect(result2.id).toBe('row-motiv')
                expect(result3.id).toBe('row-weekly')

                // But same checkInId
                expect(result1.checkInId).toBe(checkInId)
                expect(result2.checkInId).toBe(checkInId)
                expect(result3.checkInId).toBe(checkInId)
            }
        )

        it(
            'updates content on repeated calls (idempotent behavior)',
            async () => {
                const input = {
                    userId: 'mock-user-id',
                    checkInId: 'check-in-update',
                    insightType: 'MOOD_DROP_ALERT' as const,
                    title: 'Old Title',
                    content: 'Old content'
                }

                const oldRow = createMockInsight({
                    id: 'row-update',
                    title: 'Old Title',
                    content: 'Old content'
                })

                const newRow = createMockInsight({
                    id: 'row-update',
                    title: 'New Title',
                    content: 'New content'
                })

                prismaMock.aIInsight.upsert
                    .mockResolvedValueOnce(oldRow)
                    .mockResolvedValueOnce(newRow)

                const first = await aiInsightModel.createInsight(input)

                const second = await aiInsightModel.createInsight({
                    ...input,
                    title: 'New Title',
                    content: 'New content'
                })

                // Same row ID (not a new row)
                expect(first.id).toBe('row-update')
                expect(second.id).toBe('row-update')

                // But content updated
                expect(first.title).toBe('Old Title')
                expect(second.title).toBe('New Title')
                expect(first.content).toBe('Old content')
                expect(second.content).toBe('New content')
            }
        )
    })

    describe('getInsightsByUserId', () => {
        it(
            'should retrieve insights ordered by creation date descending',
            async () => {
                const mockInsights = [
                    createMockInsight({
                        id: 'insight-1',
                        createdAt: new Date('2026-03-10')
                    }),
                    createMockInsight({
                        id: 'insight-2',
                        createdAt: new Date('2026-03-09')
                    }),
                    createMockInsight({
                        id: 'insight-3',
                        createdAt: new Date('2026-03-08')
                    })
                ]
                prismaMock.aIInsight.findMany.mockResolvedValue(
                    mockInsights
                )

                const result =
                    await aiInsightModel.getInsightsByUserId(
                        'mock-user-id'
                    )

                expect(result).toEqual(mockInsights)
                expect(prismaMock.aIInsight.findMany)
                    .toHaveBeenCalledWith({
                        where: { userId: 'mock-user-id' },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    })
            })

        it('should support custom limit parameter', async () => {
            const mockInsights = [
                createMockInsight({ id: 'insight-1' })
            ]
            prismaMock.aIInsight.findMany.mockResolvedValue(
                mockInsights
            )

            await aiInsightModel.getInsightsByUserId(
                'mock-user-id',
                5
            )

            expect(prismaMock.aIInsight.findMany)
                .toHaveBeenCalledWith({
                    where: { userId: 'mock-user-id' },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                })
        })

        it(
            'should return empty array if no insights found',
            async () => {
                prismaMock.aIInsight.findMany.mockResolvedValue([])

                const result =
                    await aiInsightModel.getInsightsByUserId(
                        'mock-user-id'
                    )

                expect(result).toEqual([])
            })
    })

    describe('getInsightByCheckInId', () => {
        it('should retrieve the latest insight for a check-in', async () => {
            const mockInsight = createMockInsight()
            prismaMock.aIInsight.findFirst.mockResolvedValue(
                mockInsight
            )

            const result =
                await aiInsightModel.getInsightByCheckInId(
                    'mock-check-in-id'
                )

            expect(result).toEqual(mockInsight)
            expect(prismaMock.aIInsight.findFirst)
                .toHaveBeenCalledWith({
                    where: { checkInId: 'mock-check-in-id' },
                    orderBy: { createdAt: 'desc' }
                })
        })

        it('should return null if no insight found', async () => {
            prismaMock.aIInsight.findFirst.mockResolvedValue(
                null
            )

            const result =
                await aiInsightModel.getInsightByCheckInId(
                    'unknown-check-in-id'
                )

            expect(result).toBeNull()
        })

        it('should handle multiple insights per check-in by returning latest', async () => {
            const latestInsight = createMockInsight({
                createdAt: new Date('2026-03-10T12:00:00Z')
            })
            prismaMock.aIInsight.findFirst.mockResolvedValue(
                latestInsight
            )

            const result =
                await aiInsightModel.getInsightByCheckInId(
                    'mock-check-in-id'
                )

            if (result) {
                expect(result.createdAt).toEqual(
                    new Date('2026-03-10T12:00:00Z')
                )
            }
        })
    })
})
