import {
    MAX_CONTENT_LENGTH,
    MIN_CONTENT_LENGTH
} from '../../src/constants/aiInsight/validation'
import { validateGeneratedInsight } from '../../src/lib/aiInsight/validation/aiInsightValidator'
import { countSentences, normalizeContent } from '../../src/lib/aiInsight/validation/validationHelpers'

import type { Scenario } from './scenarios'

export type RuleResult = {
    rule: string
    pass: boolean
}

const OBSERVATION_MAX = 120
const DESCRIPTION_MAX = 140
const ICON_BY_TYPE: Record<string, string> = {
    activity_consistency: 'Activity',
    checkin_consistency: 'CalendarCheck',
    streak_consistency: 'Flame',
    mood_stability: 'Heart',
    pain_improvement: 'TrendingDown',
    better_days_pattern: 'Zap'
}

const BANNED_PUNCTUATION = /[—–“”„‘’]/
const ALLOWED_COUNT_PHRASE = /\d+\s*(ימים|ימי|יום|דיווחים|דיווח|שבועות|שבוע)/g
const TERMINAL_PUNCTUATION = /[.!?]["')\]]*$/

const hebrewShare = (text: string): number => {
    const letters = text.match(/[A-Za-z֐-׿]/g) ?? []
    if (letters.length === 0) return 0
    const hebrew = letters.filter(ch => /[֐-׿]/.test(ch)).length
    return hebrew / letters.length
}

const isCleanPlainText = (text: string): boolean =>
    !/[*#`]/.test(text) && !/\n\s*\n/.test(text.trim()) && !/^(here|draft|note)\b/i.test(text.trim())

const commonRules = (scenario: Scenario, text: string): RuleResult[] => {
    const rules: RuleResult[] = [
        { rule: 'no-dashes-or-typographic-quotes', pass: !BANNED_PUNCTUATION.test(text) }
    ]
    if (scenario.language === 'he') {
        rules.push(
            { rule: 'language-hebrew', pass: hebrewShare(text) >= 0.6 },
            { rule: 'term-mood', pass: !text.includes('המצב רוח') }
        )
    }
    return rules
}

const insightRules = (scenario: Scenario, text: string): RuleResult[] => {
    const normalized = normalizeContent(text)
    const withoutAllowedCounts = normalized.replace(ALLOWED_COUNT_PHRASE, '')
    return [
        { rule: 'complete-sentence', pass: TERMINAL_PUNCTUATION.test(normalized) },
        { rule: 'plain-text', pass: isCleanPlainText(text) },
        { rule: 'sentence-limit', pass: countSentences(normalized) <= (scenario.maxSentences ?? 3) },
        { rule: 'no-scores', pass: !/\d/.test(withoutAllowedCounts) },
        { rule: 'prod-validator', pass: validateGeneratedInsight('audit', text).isValid }
    ]
}

// The progress prompt asks the model to quote metrics ("6.9", "+0.8"), and prod's countSentences splits on every
// ".", so it counts 3 real sentences as 7 and rejects them (src/lib/progressInsights/summaryResolver.ts).
// That is a validator bug, not a model fault: count only periods that end a sentence, and leave the
// prod validator out of this scenario so every model is not penalised equally for it.
const countRealSentences = (text: string): number =>
    text.split(/[.!?]+(?=\s|$)/).map(part => part.trim()).filter(Boolean).length

const progressRules = (text: string): RuleResult[] => {
    const normalized = normalizeContent(text)
    const sentences = countRealSentences(normalized)
    return [
        { rule: 'complete-sentence', pass: TERMINAL_PUNCTUATION.test(normalized) },
        { rule: 'plain-text', pass: isCleanPlainText(text) },
        { rule: 'sentence-limit', pass: sentences >= 2 && sentences <= 4 },
        { rule: 'length-limit', pass: normalized.length >= MIN_CONTENT_LENGTH && normalized.length <= MAX_CONTENT_LENGTH }
    ]
}

const parseStrictJson = (text: string): Record<string, unknown> | null => {
    try {
        const parsed: unknown = JSON.parse(text.trim())
        return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
    } catch {
        return null
    }
}

const observationRules = (scenario: Scenario, text: string): RuleResult[] => {
    // Prod does JSON.parse(content.trim()) with no fence stripping.
    const obj = parseStrictJson(text)
    const observation = typeof obj?.observation === 'string' ? obj.observation : ''
    const description = typeof obj?.supportiveDescription === 'string' ? obj.supportiveDescription : ''
    const icon = typeof obj?.icon === 'string' ? obj.icon.trim() : ''
    return [
        { rule: 'json-strict-parse', pass: obj !== null },
        { rule: 'json-fields', pass: observation.length > 0 && description.length > 0 && icon.length > 0 },
        { rule: 'observation-max-120', pass: observation.length > 0 && observation.length <= OBSERVATION_MAX },
        { rule: 'description-max-140', pass: description.length > 0 && description.length <= DESCRIPTION_MAX },
        { rule: 'icon-matches-type', pass: icon === ICON_BY_TYPE[scenario.observationType ?? ''] },
        { rule: 'no-numbers', pass: !/\d/.test(`${observation} ${description}`) },
        { rule: 'one-sentence-each', pass: countSentences(observation) <= 1 && countSentences(description) <= 1 }
    ]
}

const feedbackRules = (scenario: Scenario, text: string): RuleResult[] => {
    // Prod extracts the first {...} block, then JSON.parse.
    const match = text.match(/\{[\s\S]*}/)
    const obj = match ? parseStrictJson(match[0]) : null
    const parts = ['acknowledge', 'normalize', 'suggest']
        .map(key => (typeof obj?.[key] === 'string' ? obj[key] as string : ''))
    const [acknowledge, normalize, suggest] = parts
    return [
        { rule: 'json-extractable', pass: obj !== null },
        { rule: 'required-fields', pass: acknowledge.length > 0 && normalize.length > 0 },
        { rule: 'suggest-present-in-full-mode', pass: scenario.feedbackMode !== 'FULL' || suggest.length > 0 },
        { rule: 'one-sentence-each', pass: parts.every(part => countSentences(part) <= 1) },
        { rule: 'json-only', pass: match !== null && text.trim() === match[0].trim() }
    ]
}

export const checkOutput = (scenario: Scenario, text: string): RuleResult[] => {
    if (text.trim().length === 0) {
        return [{ rule: 'non-empty', pass: false }]
    }

    const specific = {
        'insight-text': () => insightRules(scenario, text),
        'progress-text': () => progressRules(text),
        'observation-json': () => observationRules(scenario, text),
        'feedback-json': () => feedbackRules(scenario, text)
    }[scenario.kind]()

    return [...commonRules(scenario, text), ...specific]
}
