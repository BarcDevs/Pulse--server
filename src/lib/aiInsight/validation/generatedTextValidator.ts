import {
    type GeneratedTextKind,
    TEXT_LIMIT_TOLERANCE,
    TEXT_LIMITS,
    type TextLanguage
} from '../../../constants/aiInsight/textLimits'
import { resolveLanguage } from '../../../locales'

import {
    countSentences,
    normalizeContent
} from './validationHelpers'

type ValidationResult = {
    isValid: boolean
    reason?: string
}

export const toTextLanguage = (language?: string | null): TextLanguage =>
    resolveLanguage(language) === 'en' ? 'en' : 'he'

export const countWords = (text: string): number => {
    const normalized = normalizeContent(text)
    return normalized.length === 0 ? 0 : normalized.split(' ').length
}

export const validateGeneratedText = (
    kind: GeneratedTextKind,
    language: string | null | undefined,
    text: string
): ValidationResult => {
    const limits = TEXT_LIMITS[kind][toTextLanguage(language)]
    const normalized = normalizeContent(text)
    const words = countWords(normalized)
    const sentences = countSentences(normalized)

    if (limits.minWords !== undefined && words < limits.minWords) {
        return {
            isValid: false,
            reason: `${kind} is too short (${words} < ${limits.minWords} words)`
        }
    }

    if (words > limits.maxWords + TEXT_LIMIT_TOLERANCE.words) {
        return {
            isValid: false,
            reason: `${kind} is too long (${words} > ${limits.maxWords} words)`
        }
    }

    if (normalized.length > limits.maxChars + TEXT_LIMIT_TOLERANCE.chars) {
        return {
            isValid: false,
            reason: `${kind} is too long (${normalized.length} > ${limits.maxChars} chars)`
        }
    }

    if (sentences > limits.maxSentences) {
        return {
            isValid: false,
            reason: `${kind} has too many sentences (${sentences} > ${limits.maxSentences})`
        }
    }

    return { isValid: true }
}
