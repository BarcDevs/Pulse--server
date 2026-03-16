import {
    DIAGNOSTIC_PHRASES,
    HARD_BLOCK_PHRASES,
    MEDICAL_TERMS
} from '../../constants/aiInsight/validation'

const normalizeContent = (content: string): string =>
    content.replace(/\s+/g, ' ').trim()

const countSentences = (content: string): number => {
    const normalized = normalizeContent(content)
    const parts = normalized
        .split(/[.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    return parts.length
}

const containsHardBlockPhrase = (
    content: string
): boolean => {
    const normalized = normalizeContent(content)
    const lowerContent = normalized.toLowerCase()
    return HARD_BLOCK_PHRASES.some((phrase) =>
        lowerContent.includes(phrase)
    )
}

const containsForbiddenMedicalContext = (
    content: string
): boolean => {
    const normalized = normalizeContent(content)
    const lowerContent = normalized.toLowerCase()

    return MEDICAL_TERMS.some((term) =>
        DIAGNOSTIC_PHRASES.some(
            (diagnostic) =>
                lowerContent.includes(
                    `${diagnostic} ${term}`
                )
        )
    )
}

export {
    containsForbiddenMedicalContext,
    containsHardBlockPhrase,
    countSentences,
    normalizeContent
}