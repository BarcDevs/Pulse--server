import {
    FALLBACK_INSIGHTS,
    MAX_CONTENT_LENGTH,
    MAX_SENTENCES,
    MIN_CONTENT_LENGTH
} from '../../../constants/aiInsight/validation'
import type {InsightType} from '../../../types/insight'

import {
    containsForbiddenMedicalContext,
    containsHardBlockPhrase,
    countSentences,
    normalizeContent
} from './validationHelpers'

type ValidationResult = {
    isValid: boolean
    reason?: string
}

// region Individual Validators

const isTitleValid = (title: string): ValidationResult => {
    if (!title || title.trim().length === 0) {
        return {
            isValid: false,
            reason: 'Title is empty'
        }
    }
    return {isValid: true}
}

const isContentPresent = (content: string): ValidationResult => {
    if (!content || content.trim().length === 0) {
        return {
            isValid: false,
            reason: 'Content is empty'
        }
    }
    return {isValid: true}
}

const isContentLengthValid = (
    content: string
): ValidationResult => {
    const normalized = normalizeContent(content)

    if (normalized.length < MIN_CONTENT_LENGTH) {
        return {
            isValid: false,
            reason: `Content is too short (${normalized.length} < ${MIN_CONTENT_LENGTH})`
        }
    }

    if (normalized.length > MAX_CONTENT_LENGTH) {
        return {
            isValid: false,
            reason: `Content is too long (${normalized.length} > ${MAX_CONTENT_LENGTH})`
        }
    }

    return {isValid: true}
}

const isLanguageSafe = (
    content: string
): ValidationResult => {
    const normalized = normalizeContent(content)

    if (containsHardBlockPhrase(normalized)) {
        return {
            isValid: false,
            reason: 'Content contains prohibited diagnostic language (hard block)'
        }
    }

    if (containsForbiddenMedicalContext(normalized)) {
        return {
            isValid: false,
            reason: 'Content contains medical terms with diagnostic phrasing'
        }
    }

    return {isValid: true}
}

const isSentenceCountValid = (
    content: string
): ValidationResult => {
    const normalized = normalizeContent(content)
    const sentenceCount = countSentences(normalized)

    if (sentenceCount > MAX_SENTENCES) {
        return {
            isValid: false,
            reason: `Content has too many sentences (${sentenceCount} > ${MAX_SENTENCES})`
        }
    }

    return {isValid: true}
}

// endregion

// region Main Validator

const validateGeneratedInsight = (
    title: string,
    content: string
): ValidationResult => {
    const checks = [
        () => isTitleValid(title),
        () => isContentPresent(content),
        () => isContentLengthValid(content),
        () => isLanguageSafe(content),
        () => isSentenceCountValid(content)
    ]

    for (const check of checks) {
        const result = check()
        if (!result.isValid) {
            return result
        }
    }

    return {isValid: true}
}

// endregion

// region Fallback Content

const getFallbackContent = (
    insightType: InsightType
): string =>
    FALLBACK_INSIGHTS[insightType]

// endregion

export {
    containsForbiddenMedicalContext,
    containsHardBlockPhrase,
    countSentences,
    getFallbackContent,
    normalizeContent,
    validateGeneratedInsight
}
export type {ValidationResult}
