import { createProvider } from '../../services/aiProviders/ProviderFactory'
import type { TrendType } from '../../types/data/ProgressInsightType'
import logger from '../../utils/logger'

import { generateFallbackSummary } from './fallbackSummaryGenerator'
import type { PeriodMetrics } from './metricAggregator'
import { buildProgressInsightPrompt } from './promptBuilder'

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

        return result.content.trim()
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
