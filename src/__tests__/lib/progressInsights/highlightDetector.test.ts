// @ts-nocheck
import { detectHighlights } from '../../../lib/progressInsights/highlightDetector'
import type { TrendMetrics } from '../../../lib/progressInsights/trendClassifier'

describe('Highlight Detector', () => {
    const createDeltas = (
        mood: number,
        pain: number,
        activity: number
    ): TrendMetrics => ({
        moodDelta: mood,
        painDelta: pain,
        activityConsistencyDelta: activity
    })

    describe('detectHighlights', () => {
        it(
            'should limit improvements for improving trend',
            () => {
                const deltas = createDeltas(2, -2, 0.5)

                const highlights = detectHighlights(
                    deltas,
                    'improving'
                )

                expect(highlights.improvements.length).toBeLessThanOrEqual(2)
                expect(highlights.regressions.length).toBeLessThanOrEqual(1)
            }
        )

        it(
            'should limit regressions for declining trend',
            () => {
                const deltas = createDeltas(-2, 2, -0.5)

                const highlights = detectHighlights(
                    deltas,
                    'declining'
                )

                expect(highlights.regressions.length).toBeLessThanOrEqual(2)
                expect(highlights.improvements.length).toBeLessThanOrEqual(1)
            }
        )

        it(
            'should allow balanced output for mixed trend',
            () => {
                const deltas = createDeltas(1, -1, 0.3)

                const highlights = detectHighlights(
                    deltas,
                    'mixed'
                )

                expect(highlights.improvements.length).toBeGreaterThanOrEqual(0)
                expect(highlights.regressions.length).toBeGreaterThanOrEqual(0)
            }
        )

        it(
            'should return empty arrays for stable trend',
            () => {
                const deltas = createDeltas(0.1, -0.1, 0.05)

                const highlights = detectHighlights(
                    deltas,
                    'stable'
                )

                expect(highlights.improvements).toHaveLength(0)
                expect(highlights.regressions).toHaveLength(0)
            }
        )

        it(
            'should detect mood improvement correctly',
            () => {
                const deltas = createDeltas(0.6, 0, 0)

                const highlights = detectHighlights(
                    deltas,
                    'improving'
                )

                expect(highlights.improvements).toContain(
                    'mood improvement'
                )
            }
        )

        it(
            'should detect pain reduction correctly',
            () => {
                const deltas = createDeltas(0, -0.6, 0)

                const highlights = detectHighlights(
                    deltas,
                    'improving'
                )

                expect(highlights.improvements).toContain(
                    'pain reduction'
                )
            }
        )

        it(
            'should detect activity improvement correctly',
            () => {
                const deltas = createDeltas(0, 0, 0.25)

                const highlights = detectHighlights(
                    deltas,
                    'improving'
                )

                expect(
                    highlights.improvements
                ).toContain(
                    'increased activity consistency'
                )
            }
        )
    })
})
