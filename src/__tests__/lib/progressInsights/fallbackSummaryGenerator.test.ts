// @ts-nocheck
import { generateFallbackSummary } from '../../../lib/progressInsights/fallbackSummaryGenerator'
import type { PeriodMetrics } from '../../../lib/progressInsights/metricAggregator'

describe('Fallback Summary Generator', () => {
    const createMetrics = (
        mood: number,
        pain: number,
        activity: number
    ): PeriodMetrics => ({
        averageMood: mood,
        averagePain: pain,
        activityConsistency: activity
    })

    const countSentences = (text: string): number => {
        return text
            .split(/[.!?]\s+/)
            .filter(s => s.trim().length > 0).length
    }

    describe('generateFallbackSummary', () => {
        it(
            'should generate summary for improving trend',
            () => {
                const current = createMetrics(8, 2, 0.8)
                const previous = createMetrics(6, 4, 0.5)

                const summary = generateFallbackSummary(
                    current,
                    previous,
                    'improving'
                )

                expect(summary).toContain('improved')
                expect(summary).toContain('8.0')
                expect(summary).toContain('6.0')
                expect(countSentences(summary)).toBeGreaterThanOrEqual(2)
                expect(countSentences(summary)).toBeLessThanOrEqual(3)
            }
        )

        it(
            'should generate summary for declining trend',
            () => {
                const current = createMetrics(4, 7, 0.2)
                const previous = createMetrics(8, 2, 0.8)

                const summary = generateFallbackSummary(
                    current,
                    previous,
                    'declining'
                )

                expect(summary).toContain('declined')
                expect(summary).toContain('4.0')
                expect(summary).toContain('8.0')
                expect(countSentences(summary)).toBeGreaterThanOrEqual(2)
                expect(countSentences(summary)).toBeLessThanOrEqual(3)
            }
        )

        it(
            'should generate summary for stable trend',
            () => {
                const current = createMetrics(7, 3, 0.6)
                const previous = createMetrics(7.1, 3.1, 0.6)

                const summary = generateFallbackSummary(
                    current,
                    previous,
                    'stable'
                )

                expect(summary).toContain('stable')
                expect(summary).toContain('7.0')
                expect(countSentences(summary)).toBeGreaterThanOrEqual(2)
                expect(countSentences(summary)).toBeLessThanOrEqual(3)
            }
        )

        it(
            'should generate summary for mixed trend',
            () => {
                const current = createMetrics(8, 5, 0.6)
                const previous = createMetrics(6, 3, 0.5)

                const summary = generateFallbackSummary(
                    current,
                    previous,
                    'mixed'
                )

                expect(summary).toContain('mixed')
                expect(countSentences(summary)).toBeGreaterThanOrEqual(2)
                expect(countSentences(summary)).toBeLessThanOrEqual(3)
            }
        )

        it('should always include a metric', () => {
            const metrics = createMetrics(7, 3, 0.6)

            const improving = generateFallbackSummary(
                metrics,
                metrics,
                'improving'
            )
            const declining = generateFallbackSummary(
                metrics,
                metrics,
                'declining'
            )
            const stable = generateFallbackSummary(
                metrics,
                metrics,
                'stable'
            )
            const mixed = generateFallbackSummary(
                metrics,
                metrics,
                'mixed'
            )

            expect(improving.match(/\d+\.?\d*/g)?.length).toBeGreaterThan(0)
            expect(declining.match(/\d+\.?\d*/g)?.length).toBeGreaterThan(0)
            expect(stable.match(/\d+\.?\d*/g)?.length).toBeGreaterThan(0)
            expect(mixed.match(/\d+\.?\d*/g)?.length).toBeGreaterThan(0)
        })

        it(
            'should consistently format percentages for activity',
            () => {
                const current = createMetrics(7, 3, 0.75)
                const previous = createMetrics(7, 3, 0.5)

                const summary = generateFallbackSummary(
                    current,
                    previous,
                    'improving'
                )

                expect(summary).toContain('75%')
                expect(summary).toContain('7.0')
            }
        )

        it(
            'should be deterministic for same input',
            () => {
                const current = createMetrics(8, 2, 0.8)
                const previous = createMetrics(6, 4, 0.5)

                const summary1 = generateFallbackSummary(
                    current,
                    previous,
                    'improving'
                )
                const summary2 = generateFallbackSummary(
                    current,
                    previous,
                    'improving'
                )

                expect(summary1).toBe(summary2)
            }
        )
    })
})
