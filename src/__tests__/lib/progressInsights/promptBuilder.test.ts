// @ts-nocheck
import { buildProgressInsightPrompt } from '../../../lib/progressInsights/promptBuilder'

const makeMetrics = (mood: number, pain: number, activity: number) => ({
    averageMood: mood,
    averagePain: pain,
    activityConsistency: activity
})

describe('buildProgressInsightPrompt', () => {
    const current = makeMetrics(7, 3, 0.8)
    const previous = makeMetrics(6, 4, 0.6)
    const highlights = { improvements: ['mood', 'sleep'], regressions: ['exercise'] }

    it('includes current mood metric', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('7.0')
    })

    it('includes current pain metric', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('3.0')
    })

    it('includes improvements list', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('mood, sleep')
    })

    it('includes regressions list', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('exercise')
    })

    it('shows positive mood delta with + prefix', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('+1.0')
    })

    it('shows negative pain delta', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('-1.0')
    })

    it('omits improvements text when empty', () => {
        const prompt = buildProgressInsightPrompt(
            current, previous, { improvements: [], regressions: [] }
        )
        expect(prompt).not.toContain('Improvements:')
    })

    it('omits regressions text when empty', () => {
        const prompt = buildProgressInsightPrompt(
            current, previous, { improvements: [], regressions: [] }
        )
        expect(prompt).not.toContain('Regressions:')
    })

    it('includes constraint instructions', () => {
        const prompt = buildProgressInsightPrompt(current, previous, highlights)
        expect(prompt).toContain('Do not provide medical advice')
    })
})
