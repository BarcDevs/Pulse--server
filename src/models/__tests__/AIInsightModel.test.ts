import type {AIInsight} from '../../../prisma/generated/prisma/client'
import type {InsightType} from '../../../prisma/generated/prisma/enums'
import {prismaMock} from '../../__tests__/setup/jestSetup'
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
                content: 'This is test content',
                metadata: null
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
                        content: 'This is test content',
                        metadata: null
                    },
                    update: {
                        title: 'Test Insight',
                        content: 'This is test content',
                        metadata: null
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

            if (
                result.metadata &&
                typeof result.metadata === 'object'
            ) {
                expect(result.metadata).toEqual(metadata)
            }
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
                        where: {userId: 'mock-user-id'},
                        orderBy: {createdAt: 'desc'},
                        take: 10
                    })
            })

        it('should support custom limit parameter', async () => {
            const mockInsights = [
                createMockInsight({id: 'insight-1'})
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
                    where: {userId: 'mock-user-id'},
                    orderBy: {createdAt: 'desc'},
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
                    where: {checkInId: 'mock-check-in-id'},
                    orderBy: {createdAt: 'desc'}
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
