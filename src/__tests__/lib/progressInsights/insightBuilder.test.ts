// @ts-nocheck
import {
    buildFallbackInsight,
    buildProgressInsight
} from '../../../lib/progressInsights/insightBuilder'

const makeMetrics = (mood: number, pain: number, activity: number) => ({
    averageMood: mood,
    averagePain: pain,
    activityConsistency: activity
})

const baseParams = {
    summary: 'Good week overall',
    trend: 'improving' as const,
    highlights: { improvements: ['mood'], regressions: [] },
    currentStart: new Date('2026-01-01'),
    currentEnd: new Date('2026-01-07'),
    previousStart: new Date('2025-12-25'),
    previousEnd: new Date('2025-12-31'),
    currentMetrics: makeMetrics(7, 3, 0.8),
    previousMetrics: makeMetrics(6, 4, 0.6)
}

describe('buildProgressInsight', () => {
    it('computes positive moodDelta', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.metadata.moodDelta).toBe(1)
    })

    it('computes negative painDelta', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.metadata.painDelta).toBe(-1)
    })

    it('takes activityConsistency from current metrics', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.metadata.activityConsistency).toBe(0.8)
    })

    it('returns correct summary and trend', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.summary).toBe('Good week overall')
        expect(result.trend).toBe('improving')
    })

    it('returns correct highlights', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.highlights.improvements).toEqual(['mood'])
        expect(result.highlights.regressions).toEqual([])
    })

    it('returns correct period dates', () => {
        const result = buildProgressInsight(baseParams)
        expect(result.period.currentStart).toEqual(new Date('2026-01-01'))
        expect(result.period.previousEnd).toEqual(new Date('2025-12-31'))
    })
})

describe('buildFallbackInsight', () => {
    const start = new Date('2026-01-01')
    const end = new Date('2026-01-07')
    const prevStart = new Date('2025-12-25')
    const prevEnd = new Date('2025-12-31')

    it('returns stable trend', () => {
        const result = buildFallbackInsight(start, end, prevStart, prevEnd)
        expect(result.trend).toBe('stable')
    })

    it('returns zero deltas', () => {
        const result = buildFallbackInsight(start, end, prevStart, prevEnd)
        expect(result.metadata.moodDelta).toBe(0)
        expect(result.metadata.painDelta).toBe(0)
        expect(result.metadata.activityConsistency).toBe(0)
    })

    it('returns empty highlights', () => {
        const result = buildFallbackInsight(start, end, prevStart, prevEnd)
        expect(result.highlights.improvements).toEqual([])
        expect(result.highlights.regressions).toEqual([])
    })

    it('returns non-empty string summary', () => {
        const result = buildFallbackInsight(start, end, prevStart, prevEnd)
        expect(typeof result.summary).toBe('string')
        expect(result.summary.length).toBeGreaterThan(0)
    })

    it('passes period dates through', () => {
        const result = buildFallbackInsight(start, end, prevStart, prevEnd)
        expect(result.period.currentStart).toEqual(start)
        expect(result.period.currentEnd).toEqual(end)
    })
})
