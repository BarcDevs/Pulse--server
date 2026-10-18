import { GeneratedTextKind } from '../../constants/aiInsight/textLimits'
import { MIN_CONTENT_LENGTH } from '../../constants/aiInsight/validation'
import { createProvider } from '../../services/aiProviders/ProviderFactory'
import type { TrendType } from '../../types/data/ProgressInsightType'
import logger from '../../utils/logger'
import { validateGeneratedText } from '../aiInsight/validation/generatedTextValidator'
import {
    normalizeContent,
    sanitizeGeneratedText
} from '../aiInsight/validation/validationHelpers'
import { ProgressInsightPromptBuilder } from '../prompts/ProgressInsightPromptBuilder'

import { generateFallbackSummary } from './fallbackSummaryGenerator'
import type { PeriodMetrics } from './metricAggregator'

type ValidationResult = ReturnType<typeof validateGeneratedText>

const validateSummary = (
    content: string,
    language?: string | null
): ValidationResult => {
    if (normalizeContent(content).length < MIN_CONTENT_LENGTH)
        return { isValid: false, reason: 'Summary is too short' }

    return validateGeneratedText(
        GeneratedTextKind.PROGRESS_SUMMARY,
        language,
        content
    )
}

type SummaryResolution = {
    summary: string
    usedFallback: boolean
}

const generateAISummary = async (
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics,
    language?: string | null
): Promise<string> => {
    try {
        const prompt = new ProgressInsightPromptBuilder().build(
            {
                current: currentMetrics,
                previous: previousMetrics,
                highlights: { improvements: [], regressions: [] }
            },
            language
        )

        const provider = createProvider()
        const result = await provider.generateContent({
            prompt
        })
        const content = sanitizeGeneratedText(result.content.trim())

        const validation = validateSummary(content, language)

        if (!validation.isValid) {
            logger.warn(
                'AI progress summary failed validation, using fallback',
                { reason: validation.reason, length: content.length }
            )
            return ''
        }

        return content
    } catch (error) {
        const errorMsg = error instanceof Error
            ? error.message
            : 'Unknown error'

        logger.error(
            'AI generation failed for progress insights',
            { error: errorMsg }
        )

        return ''
    }
}

export const resolveSummary = async (
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics,
    trend: TrendType,
    language?: string | null
): Promise<SummaryResolution> => {
    const aiSummary = await generateAISummary(
        currentMetrics,
        previousMetrics,
        language
    )

    if (aiSummary && aiSummary.length > 0) {
        return {
            summary: aiSummary,
            usedFallback: false
        }
    }

    return {
        summary: generateFallbackSummary(
            currentMetrics,
            previousMetrics,
            trend
        ),
        usedFallback: true
    }
}
