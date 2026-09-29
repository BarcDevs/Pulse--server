import {
    MAX_CONTENT_LENGTH,
    MAX_SENTENCES,
    MIN_CONTENT_LENGTH
} from '../../constants/aiInsight/validation'
import { createProvider } from '../../services/aiProviders/ProviderFactory'
import type { TrendType } from '../../types/data/ProgressInsightType'
import logger from '../../utils/logger'
import {
    countSentences,
    normalizeContent
} from '../aiInsight/validation/validationHelpers'

import { generateFallbackSummary } from './fallbackSummaryGenerator'
import type { PeriodMetrics } from './metricAggregator'
import { buildProgressInsightPrompt } from './promptBuilder'

const isValidSummary = (content: string): boolean => {
    const normalized = normalizeContent(content)
    if (
        normalized.length < MIN_CONTENT_LENGTH
        || normalized.length > MAX_CONTENT_LENGTH
    ) return false

    return countSentences(normalized) <= MAX_SENTENCES
}

type SummaryResolution = {
    summary: string
    usedFallback: boolean
}

const generateAISummary = async (
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics
): Promise<string> => {
    try {
        const prompt = buildProgressInsightPrompt(
            currentMetrics,
            previousMetrics,
            { improvements: [], regressions: [] }
        )

        const provider = createProvider()
        const result = await provider.generateContent({
            prompt
        })
        const content = result.content.trim()

        if (!isValidSummary(content)) {
            logger.warn(
                'AI progress summary failed validation, using fallback',
                { length: content.length }
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
    trend: TrendType
): Promise<SummaryResolution> => {
    const aiSummary = await generateAISummary(
        currentMetrics,
        previousMetrics
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
