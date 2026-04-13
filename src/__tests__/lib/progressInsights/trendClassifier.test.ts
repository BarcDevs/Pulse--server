// @ts-nocheck
import type { PeriodMetrics } from '../../../lib/progressInsights/metricAggregator'
import {
    classifyTrend,
    computeDeltas
} from '../../../lib/progressInsights/trendClassifier'

describe('Trend Classifier', () => {
    const createMetrics = (
        mood: number,
        pain: number,
        activity: number
    ): PeriodMetrics => ({
        averageMood: mood,
        averagePain: pain,
        activityConsistency: activity
    })

    describe('computeDeltas', () => {
        it('should compute correct deltas', () => {
            const current = createMetrics(8, 2, 0.8)
            const previous = createMetrics(6, 4, 0.5)

            const deltas = computeDeltas(current, previous)

            expect(deltas.moodDelta).toBe(2)
            expect(deltas.painDelta).toBe(-2)
            expect(deltas.activityConsistencyDelta).toBeCloseTo(0.3, 5)
        })

        it('should handle zero deltas', () => {
            const metrics = createMetrics(7, 3, 0.6)

            const deltas = computeDeltas(metrics, metrics)

            expect(deltas.moodDelta).toBe(0)
            expect(deltas.painDelta).toBe(0)
            expect(deltas.activityConsistencyDelta).toBe(0)
        })
    })

    describe('classifyTrend', () => {
        it('should return stable when all deltas within stableRange', () => {
            const current = createMetrics(7.1, 3.1, 0.6)
            const previous = createMetrics(7, 3, 0.55)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('stable')
        })

        it('should return improving when all metrics improve', () => {
            const current = createMetrics(8.5, 1.5, 0.9)
            const previous = createMetrics(6, 4, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('improving')
        })

        it(
            'should return improving when 2+ metrics improve',
            () => {
                const current = createMetrics(8.5, 1.5, 0.9)
                const previous = createMetrics(6, 2, 0.5)

                const trend = classifyTrend(current, previous)

                expect(trend).toBe('improving')
            }
        )

        it('should return declining when all metrics decline', () => {
            const current = createMetrics(4.5, 7.5, 0.2)
            const previous = createMetrics(8, 3, 0.8)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('declining')
        })

        it(
            'should return declining when 2+ metrics decline',
            () => {
                const current = createMetrics(4.5, 7.5, 0.2)
                const previous = createMetrics(6, 5, 0.5)

                const trend = classifyTrend(current, previous)

                expect(trend).toBe('declining')
            }
        )

        it('should return mixed when score is +1', () => {
            const current = createMetrics(8, 3, 0.5)
            const previous = createMetrics(6, 3, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('mixed')
        })

        it('should return mixed when score is -1', () => {
            const current = createMetrics(4, 3, 0.5)
            const previous = createMetrics(6, 3, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('mixed')
        })

        it('should return mixed for conflicting metrics', () => {
            const current = createMetrics(8.5, 4, 0.8)
            const previous = createMetrics(6, 3, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).toBe('mixed')
        })

        it('should detect pain improvement with negative threshold', () => {
            const current = createMetrics(7, 2, 0.5)
            const previous = createMetrics(7, 3, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).not.toBe('declining')
        })

        it('should detect pain regression with negative threshold', () => {
            const current = createMetrics(7, 5, 0.5)
            const previous = createMetrics(7, 3, 0.5)

            const trend = classifyTrend(current, previous)

            expect(trend).not.toBe('improving')
        })
    })
})
