import type { GeneratedTextKind } from '../../../constants/aiInsight/textLimits'
import { MIN_CONTENT_LENGTH } from '../../../constants/aiInsight/validation'
import { getMessages } from '../../../locales'
import type { InsightType } from '../../../types/insight'

import { validateGeneratedText } from './generatedTextValidator'
import {
    containsForbiddenMedicalContext,
    containsHardBlockPhrase,
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
    return { isValid: true }
}

const isContentPresent = (content: string): ValidationResult => {
    if (!content || content.trim().length === 0) {
        return {
            isValid: false,
            reason: 'Content is empty'
        }
    }
    return { isValid: true }
}

const isContentLongEnough = (
    content: string
): ValidationResult => {
    const normalized = normalizeContent(content)

    if (normalized.length < MIN_CONTENT_LENGTH) {
        return {
            isValid: false,
            reason: `Content is too short (${normalized.length} < ${MIN_CONTENT_LENGTH})`
        }
    }

    return { isValid: true }
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

    return { isValid: true }
}

// endregion

// region Main Validator

export const validateGeneratedInsight = (
    kind: GeneratedTextKind,
    language: string | null | undefined,
    title: string,
    content: string
): ValidationResult => {
    const checks = [
        () => isTitleValid(title),
        () => isContentPresent(content),
        () => isContentLongEnough(content),
        () => isLanguageSafe(content),
        () => validateGeneratedText(kind, language, content)
    ]

    for (const check of checks) {
        const result = check()
        if (!result.isValid) {
            return result
        }
    }

    return { isValid: true }
}

// endregion

// region Fallback Content

export const getFallbackContent = (
    insightType: InsightType,
    language?: string | null
): string =>
    getMessages(language)
        .insights.fallback[insightType]

// endregion
