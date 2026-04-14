import {
    DIAGNOSTIC_PHRASES,
    HARD_BLOCK_PHRASES,
    MEDICAL_TERMS
} from '../../../constants/aiInsight/validation'

export const normalizeContent = (content: string): string =>
    content.replace(/\s+/g, ' ').trim()

export const countSentences = (content: string): number => {
    const normalized = normalizeContent(content)
    const parts = normalized
        .split(/[.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    return parts.length
}

export const containsHardBlockPhrase = (
    content: string
): boolean => {
    const normalized = normalizeContent(content)
    const lowerContent = normalized.toLowerCase()
    return HARD_BLOCK_PHRASES.some((phrase: string) =>
        lowerContent.includes(phrase)
    )
}

export const containsForbiddenMedicalContext = (
    content: string
): boolean => {
    const normalized = normalizeContent(content)
    const lowerContent = normalized.toLowerCase()

    return MEDICAL_TERMS.some((term: string) =>
        DIAGNOSTIC_PHRASES.some(
            (diagnostic: string) =>
                lowerContent.includes(
                    `${diagnostic} ${term}`
                )
        )
    )
}