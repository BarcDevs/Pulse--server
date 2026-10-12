import { ProgressInsightPromptBuilder } from '../ProgressInsightPromptBuilder'

const makeMetrics = (mood: number, pain: number, activity: number) => ({
    averageMood: mood,
    averagePain: pain,
    activityConsistency: activity
})

describe('ProgressInsightPromptBuilder', () => {
    const current = makeMetrics(7, 3, 0.8)
    const previous = makeMetrics(6, 4, 0.6)
    const highlights = { improvements: ['mood', 'sleep'], regressions: ['exercise'] }

    it('includes current mood metric', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('7.0')
    })

    it('includes current pain metric', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('3.0')
    })

    it('includes improvements list', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('mood, sleep')
    })

    it('includes regressions list', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('exercise')
    })

    it('shows positive mood delta with + prefix', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('+1.0')
    })

    it('shows negative pain delta', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('-1.0')
    })

    it('omits improvements text when empty', () => {
        const prompt = new ProgressInsightPromptBuilder().build({
            current,
            previous,
            highlights: { improvements: [], regressions: [] }
        })
        expect(prompt).not.toContain('Improvements:')
    })

    it('omits regressions text when empty', () => {
        const prompt = new ProgressInsightPromptBuilder().build({
            current,
            previous,
            highlights: { improvements: [], regressions: [] }
        })
        expect(prompt).not.toContain('Regressions:')
    })

    it('includes constraint instructions', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current, previous, highlights })
        expect(prompt).toContain('Do not provide medical advice')
    })
})

describe('ProgressInsightPromptBuilder language', () => {
    const metrics = { averageMood: 7, averagePain: 3, activityConsistency: 0.8 }
    const highlights = { improvements: [], regressions: [] }

    it('asks for the user language and the shared punctuation rules', () => {
        const prompt = new ProgressInsightPromptBuilder().build({ current: metrics, previous: metrics, highlights }, 'he')

        expect(prompt).toContain('Respond entirely in he')
        expect(prompt).toContain('Never use em dashes')
    })
})
