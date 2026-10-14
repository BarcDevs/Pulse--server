import type {
    InterventionContext,
    InterventionIntent
} from '../../../types/feedback'
import { FeedbackPromptBuilder } from '../FeedbackPromptBuilder'

const intent = (mode: InterventionIntent['mode']): InterventionIntent => ({
    primaryReason: 'NEGATIVE_TREND',
    severity: 'medium',
    mode,
    trendDuration: 3
})

const context: InterventionContext = {
    recentCheckIns: [],
    trend: { direction: 'down', duration: 3, gapDays: 0 },
    highlights: [{ type: 'drop', value: 3 }]
}

describe('FeedbackPromptBuilder', () => {
    it('carries the shared language rules, including the dash ban', () => {
        const prompt = new FeedbackPromptBuilder().build({ intent: intent('FULL'), context: context }, 'he')

        expect(prompt).toContain('Never use em dashes')
        expect(prompt).toContain('מצב הרוח')
    })

    it('describes the severity and reason', () => {
        const prompt = new FeedbackPromptBuilder().build({ intent: intent('FULL'), context: context }, 'en')

        expect(prompt).toContain('moderate negative trend')
    })

    it('asks for a suggest field only in FULL mode', () => {
        expect(new FeedbackPromptBuilder().build({ intent: intent('FULL'), context: context }, 'en'))
            .toContain('"suggest"')
        expect(new FeedbackPromptBuilder().build({ intent: intent('SOFT'), context: context }, 'en'))
            .not.toContain('"suggest"')
    })

    it('warns about a gap since the prior check-in', () => {
        const gapped = {
            ...context,
            trend: { ...context.trend, gapDays: 10 }
        }

        expect(new FeedbackPromptBuilder().build({ intent: intent('SOFT'), context: gapped }, 'en'))
            .toContain('10 day gap')
    })
})
