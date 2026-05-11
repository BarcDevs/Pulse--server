import { getMessages } from '../../locales'
import type {
    ProgressInsight,
    ProgressInsightHighlights,
    TrendType
} from '../../types/data/ProgressInsightType'

import type { PeriodMetrics } from './metricAggregator'

type InsightParams = {
    summary: string
    trend: TrendType
    highlights: ProgressInsightHighlights
    currentStart: Date
    currentEnd: Date
    previousStart: Date
    previousEnd: Date
    currentMetrics: PeriodMetrics
    previousMetrics: PeriodMetrics
}

export const buildProgressInsight = (
    params: InsightParams
): ProgressInsight => {
    const {
        summary,
        trend,
        highlights,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentMetrics,
        previousMetrics
    } = params

    const moodDelta = currentMetrics.averageMood - previousMetrics.averageMood
    const painDelta = currentMetrics.averagePain - previousMetrics.averagePain

    return {
        summary,
        trend,
        highlights,
        period: {
            currentStart,
            currentEnd,
            previousStart,
            previousEnd
        },
        metadata: {
            moodDelta,
            painDelta,
            activityConsistency: currentMetrics.activityConsistency
        }
    }
}

export const buildFallbackInsight = (
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    language?: string | null
): ProgressInsight => ({
    summary: getMessages(language).progress.fallback,
    trend: 'stable',
    highlights: {
        improvements: [],
        regressions: []
    },
    period: {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
    },
    metadata: {
        moodDelta: 0,
        painDelta: 0,
        activityConsistency: 0
    }
})
