import {
    GeneratedTextKind,
    TEXT_LIMITS
} from '../../../constants/aiInsight/textLimits'
import { MoodDropPromptBuilder } from '../MoodDropPromptBuilder'
import { MotivationalPromptBuilder } from '../MotivationalPromptBuilder'
import { ObservationPromptBuilder } from '../ObservationPromptBuilder'
import { ProgressInsightPromptBuilder } from '../ProgressInsightPromptBuilder'
import { lengthRule, PLAIN_TONE_RULE } from '../sharedInstructions'
import { WeeklySummaryPromptBuilder } from '../WeeklySummaryPromptBuilder'

const metrics = {
    averageMood: 6,
    averagePain: 4,
    activityConsistency: 0.5
} as never

const prompts = (language: string): Array<[GeneratedTextKind, string]> => [
    [GeneratedTextKind.MOTIVATIONAL, new MotivationalPromptBuilder().build({ checkIns: [] }, language)],
    [GeneratedTextKind.WEEKLY_SUMMARY, new WeeklySummaryPromptBuilder().build({ checkIns: [] }, language)],
    [GeneratedTextKind.MOOD_DROP_ALERT, new MoodDropPromptBuilder().build({ checkIns: [] }, language)],
    [
        GeneratedTextKind.PROGRESS_SUMMARY,
        new ProgressInsightPromptBuilder().build({
            current: metrics,
            previous: metrics,
            highlights: { improvements: [], regressions: [] }
        }, language)
    ],
    [
        GeneratedTextKind.DAILY_OBSERVATION,
        new ObservationPromptBuilder().build({ type: 'mood_stability' }, language)
    ]
]

describe('lengthRule', () => {
    it('states the limits from TEXT_LIMITS', () => {
        const limits = TEXT_LIMITS[GeneratedTextKind.WEEKLY_SUMMARY].he
        const rule = lengthRule(GeneratedTextKind.WEEKLY_SUMMARY, 'he')

        expect(rule).toContain(`at most ${limits.maxWords} words`)
        expect(rule).toContain(`${limits.maxChars} characters`)
        expect(rule).toContain(`at most ${limits.maxSentences} sentences`)
    })

    it('uses the English limits for English', () => {
        const limits = TEXT_LIMITS[GeneratedTextKind.MOTIVATIONAL].en

        expect(lengthRule(GeneratedTextKind.MOTIVATIONAL, 'en')).toContain(`at most ${limits.maxWords} words`)
    })

    it('says exactly 1 sentence for a one-sentence kind', () => {
        expect(lengthRule(GeneratedTextKind.DAILY_OBSERVATION, 'he')).toContain('exactly 1 sentence')
    })
})

describe.each(['he', 'en'])('prompts carry their kind limits (%s)', (language) => {
    it.each(prompts(language))('%s', (kind, prompt) => {
        const subject = kind === GeneratedTextKind.DAILY_OBSERVATION ? 'observation' : 'The text'

        expect(prompt).toContain(lengthRule(kind, language, subject))
        expect(prompt).toContain(PLAIN_TONE_RULE)
    })
})
