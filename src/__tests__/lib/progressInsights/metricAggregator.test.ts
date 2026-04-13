// @ts-nocheck
import { computePeriodMetrics } from '../../../lib/progressInsights/metricAggregator'
import type { CheckInType } from '../../../types/data/CheckInType'

describe('Metric Aggregator', () => {
    const createCheckIn = (
        moodScore: number,
        painLevel: number,
        checkInDate: Date,
        activities: string[] = []
    ): Pick<
        CheckInType,
        'moodScore' | 'painLevel' | 'activities' | 'checkInDate'
    > => ({
        moodScore,
        painLevel,
        activities,
        checkInDate
    })

    describe('computePeriodMetrics', () => {
        it('should return zeros for empty array', () => {
            const metrics = computePeriodMetrics([])

            expect(metrics.averageMood).toBe(0)
            expect(metrics.averagePain).toBe(0)
            expect(metrics.activityConsistency).toBe(0)
        })

        it('should compute correct mood average', () => {
            const checkIns = [
                createCheckIn(8, 3, new Date()),
                createCheckIn(6, 3, new Date()),
                createCheckIn(10, 3, new Date())
            ]

            const metrics = computePeriodMetrics(checkIns)

            expect(metrics.averageMood).toBe(8)
        })

        it('should compute correct pain average', () => {
            const checkIns = [
                createCheckIn(7, 2, new Date()),
                createCheckIn(7, 4, new Date()),
                createCheckIn(7, 6, new Date())
            ]

            const metrics = computePeriodMetrics(checkIns)

            expect(metrics.averagePain).toBe(4)
        })

        it(
            'should compute activity consistency as days with activities / total days',
            () => {
                const baseDate = new Date()
                const checkIns = [
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate),
                        ['walking']
                    ),
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate.getTime() - 86400000),
                        ['walking']
                    ),
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate.getTime() - 172800000),
                        []
                    )
                ]

                const metrics = computePeriodMetrics(checkIns)

                expect(metrics.activityConsistency).toBeCloseTo(
                    2 / 3,
                    5
                )
            }
        )

        it(
            'should handle multiple check-ins on same day',
            () => {
                const baseDate = new Date()
                const checkIns = [
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate),
                        ['walking']
                    ),
                    createCheckIn(
                        8,
                        2,
                        new Date(baseDate),
                        ['yoga']
                    )
                ]

                const metrics = computePeriodMetrics(checkIns)

                expect(metrics.averageMood).toBe(7.5)
                expect(metrics.averagePain).toBe(2.5)
                expect(metrics.activityConsistency).toBe(1)
            }
        )

        it(
            'should return activity consistency of 0 for no activities',
            () => {
                const checkIns = [
                    createCheckIn(
                        7,
                        3,
                        new Date(),
                        []
                    ),
                    createCheckIn(
                        7,
                        3,
                        new Date(new Date().getTime() - 86400000),
                        []
                    )
                ]

                const metrics = computePeriodMetrics(checkIns)

                expect(metrics.activityConsistency).toBe(0)
            }
        )

        it(
            'should return activity consistency of 1 for all activities',
            () => {
                const baseDate = new Date()
                const checkIns = [
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate),
                        ['walking']
                    ),
                    createCheckIn(
                        7,
                        3,
                        new Date(baseDate.getTime() - 86400000),
                        ['yoga']
                    )
                ]

                const metrics = computePeriodMetrics(checkIns)

                expect(metrics.activityConsistency).toBe(1)
            }
        )

        it(
            'should handle single check-in correctly',
            () => {
                const checkIns = [
                    createCheckIn(
                        8,
                        2,
                        new Date(),
                        ['walking']
                    )
                ]

                const metrics = computePeriodMetrics(checkIns)

                expect(metrics.averageMood).toBe(8)
                expect(metrics.averagePain).toBe(2)
                expect(metrics.activityConsistency).toBe(1)
            }
        )
    })
})
