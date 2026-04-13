// @ts-nocheck
/* eslint-ignore-file */
import * as cache from '../../lib/cache/progressInsightsCache'
import * as checkInModel from '../../models/CheckInModel'
import * as progressInsightsService from '../../services/progressInsightsService'

jest.mock('../../models/CheckInModel')
jest.mock('../../lib/cache/progressInsightsCache')
jest.mock('../../services/aiProviders/ProviderFactory')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn()
    }
}))

describe('Progress Insights Service', () => {
    const mockUserId = 'test-user-123'
    const mockProfileId = 'profile-123'

    const mockCheckIn = (
        moodScore: number,
        painLevel: number,
        date: Date,
        activities: string[] = []
    ) => ({
        id: `check-in-${date.getTime()}`,
        profileId: mockProfileId,
        checkInDate: date,
        moodScore,
        painLevel,
        activities,
        notes: null,
        createdAt: date,
        updatedAt: date,
        insights: []
    })

    beforeEach(() => {
        jest.clearAllMocks()
        cache.clear()
    })

    describe('generateProgressInsight', () => {
        it(
            'should return fallback for insufficient data',
            async () => {
                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockResolvedValue([
                    mockCheckIn(
                        7,
                        3,
                        new Date()
                    )
                ])

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.trend).toBe('stable')
                expect(result.summary).toContain(
                    'Not enough data yet'
                )
                expect(result.highlights.improvements).toHaveLength(0)
                expect(result.highlights.regressions).toHaveLength(0)
            }
        )

        it(
            'should return improving trend when metrics improve',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(8, 2, new Date(today)),
                    mockCheckIn(8.5, 2.5, new Date(today.getTime() - 86400000)),
                    mockCheckIn(8, 2, new Date(today.getTime() - 172800000))
                ]

                const previousCheckIns = [
                    mockCheckIn(6, 5, new Date(today.getTime() - 604800000)),
                    mockCheckIn(5.5, 5.5, new Date(today.getTime() - 691200000)),
                    mockCheckIn(6, 5, new Date(today.getTime() - 777600000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockImplementation(
                    async (_, start, _end) => {
                        const now = new Date()
                        const sevenDaysAgo = new Date(
                            now.getTime() - 604800000
                        )
                        if (start >= sevenDaysAgo) {
                            return currentCheckIns
                        }
                        return previousCheckIns
                    }
                )

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.trend).toBe('improving')
                expect(result.highlights.improvements.length)
                    .toBeGreaterThan(0)
            }
        )

        it(
            'should return declining trend when metrics decline',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(4, 7, new Date(today)),
                    mockCheckIn(4.5, 7.5, new Date(today.getTime() - 86400000)),
                    mockCheckIn(4, 7, new Date(today.getTime() - 172800000))
                ]

                const previousCheckIns = [
                    mockCheckIn(8, 2, new Date(today.getTime() - 604800000)),
                    mockCheckIn(8.5, 2.5, new Date(today.getTime() - 691200000)),
                    mockCheckIn(8, 2, new Date(today.getTime() - 777600000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockImplementation(
                    async (_, start, _end) => {
                        const now = new Date()
                        const sevenDaysAgo = new Date(
                            now.getTime() - 604800000
                        )
                        if (start >= sevenDaysAgo) {
                            return currentCheckIns
                        }
                        return previousCheckIns
                    }
                )

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.trend).toBe('declining')
                expect(result.highlights.regressions.length)
                    .toBeGreaterThan(0)
            }
        )

        it(
            'should return stable trend when metrics within stable range',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(7, 3, new Date(today)),
                    mockCheckIn(7.1, 3.1, new Date(today.getTime() - 86400000)),
                    mockCheckIn(7, 3, new Date(today.getTime() - 172800000))
                ]

                const previousCheckIns = [
                    mockCheckIn(7.1, 2.9, new Date(today.getTime() - 604800000)),
                    mockCheckIn(7, 3, new Date(today.getTime() - 691200000)),
                    mockCheckIn(7.1, 3, new Date(today.getTime() - 777600000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockImplementation(
                    async (_, start, end) => {
                        const now = new Date()
                        const sevenDaysAgo = new Date(
                            now.getTime() - 604800000
                        )
                        if (start >= sevenDaysAgo) {
                            return currentCheckIns
                        }
                        return previousCheckIns
                    }
                )

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.trend).toBe('stable')
                expect(result.highlights.improvements).toHaveLength(0)
                expect(result.highlights.regressions).toHaveLength(0)
            }
        )

        it(
            'should return mixed trend for conflicting metrics',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(8.5, 4, new Date(today)),
                    mockCheckIn(8, 4, new Date(today.getTime() - 86400000)),
                    mockCheckIn(8.5, 3.5, new Date(today.getTime() - 172800000))
                ]

                const previousCheckIns = [
                    mockCheckIn(6, 3, new Date(today.getTime() - 604800000)),
                    mockCheckIn(5.5, 3, new Date(today.getTime() - 691200000)),
                    mockCheckIn(6, 3, new Date(today.getTime() - 777600000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockImplementation(
                    async (_, start, end) => {
                        const now = new Date()
                        const sevenDaysAgo = new Date(
                            now.getTime() - 604800000
                        )
                        if (start >= sevenDaysAgo) {
                            return currentCheckIns
                        }
                        return previousCheckIns
                    }
                )

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.trend).toBe('mixed')
            }
        )

        it(
            'should use cache when data is unchanged',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(7, 3, new Date(today)),
                    mockCheckIn(7, 3, new Date(today.getTime() - 86400000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockResolvedValue(currentCheckIns)

                const firstCall = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                jest.clearAllMocks()

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                const secondCall = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(firstCall).toEqual(secondCall)
            }
        )

        it(
            'should have valid period dates in response',
            async () => {
                const today = new Date()
                const currentCheckIns = [
                    mockCheckIn(7, 3, new Date(today)),
                    mockCheckIn(7, 3, new Date(today.getTime() - 86400000)),
                    mockCheckIn(7, 3, new Date(today.getTime() - 172800000))
                ]

                jest.spyOn(
                    checkInModel,
                    'getProfileIdForUser'
                ).mockResolvedValue(mockProfileId)

                jest.spyOn(
                    checkInModel,
                    'getCheckIns'
                ).mockResolvedValue([currentCheckIns[0]])

                jest.spyOn(
                    checkInModel,
                    'getCheckInsForDateRange'
                ).mockResolvedValue(currentCheckIns)

                const result = await progressInsightsService
                    .generateProgressInsight(mockUserId)

                expect(result.period).toBeDefined()
                expect(result.period.currentStart).toBeInstanceOf(Date)
                expect(result.period.currentEnd).toBeInstanceOf(Date)
                expect(result.period.previousStart).toBeInstanceOf(Date)
                expect(result.period.previousEnd).toBeInstanceOf(Date)
                expect(
                    result.period.currentStart < result.period.currentEnd
                ).toBe(true)
                expect(
                    result.period.previousEnd < result.period.currentStart
                ).toBe(true)
            }
        )
    })
})
