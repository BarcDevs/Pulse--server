import { brandConfig } from '../../config/app'
import {
    type GeneratedTextKind,
    TEXT_LIMITS
} from '../../constants/aiInsight/textLimits'
import { resolveLanguage } from '../../locales'
import { toTextLanguage } from '../aiInsight/validation/generatedTextValidator'

export const languageInstruction = (
    language?: string | null
): string => {
    const lang = resolveLanguage(language)
    const base = `Respond entirely in ${lang}. Write naturally for native speakers of that language - do not translate word-for-word from English; use phrasing that feels native. Never use em dashes, en dashes or typographic quotes; use only plain keyboard punctuation. Write activity names as bare nouns, without a leading definite article.`
    const terminology =
        lang === 'he'
            ? ` When referring to check-ins, use the term "צ'ק אין". Use the exact term 'מצב הרוח' for mood (never 'המצב רוח').`
            : ''
    return base + terminology
}

export const NO_SCORES_RULE = '- Never quote mood or pain scores, averages or any number from the 1 to 10 scales (not "your mood is 8", not "your pain stays around 3"). The numbers in the context are only for you to understand the pattern: describe it in words instead (steadier, lighter, heavier, improving). Streak and day counts may be mentioned'

export const PLAIN_TONE_RULE = `- Plain tone: write the way a kind friend would say it, in everyday words, for someone with little energy to read. No statistics wording (not "lower than before", not "נמוך יותר מבעבר", not "compared to the previous period"). Make one concrete point, not a list of findings`

// The same numbers the validator enforces, so the prompt and the check cannot drift apart
export const lengthRule = (
    kind: GeneratedTextKind,
    language?: string | null,
    subject = 'The text'
): string => {
    const {
        minWords,
        maxWords,
        maxChars,
        maxSentences
    } = TEXT_LIMITS[kind][toTextLanguage(language)]
    const words = minWords === undefined
        ? `at most ${maxWords} words`
        : `between ${minWords} and ${maxWords} words`
    const sentences = maxSentences === 1
        ? 'exactly 1 sentence'
        : `at most ${maxSentences} sentences`

    return `- Length (strict, never exceed): ${subject} is ${words}, at most ${maxChars} characters, and ${sentences}. Shorter is better`
}

export const FINAL_TEXT_ONLY_RULE = `- Do not show your reasoning, drafts, alternatives, or revisions
- Output ONLY the final message text, with nothing before or after it`

export const injectBrandName = (prompt: string): string =>
    prompt.replaceAll('{{brandName}}', brandConfig.brandName)
