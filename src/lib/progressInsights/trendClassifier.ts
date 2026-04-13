import { progressInsightsConfig } from '../../config/progressInsights'
import type { TrendType } from '../../types/data/ProgressInsightType'

import type { PeriodMetrics } from './metricAggregator'

export type TrendMetrics = {
    moodDelta: number
    painDelta: number
    activityConsistencyDelta: number
}

export const computeDeltas = (
    current: PeriodMetrics,
    previous: PeriodMetrics
): TrendMetrics => ({
    moodDelta: current.averageMood - previous.averageMood,
    painDelta: current.averagePain - previous.averagePain,
    activityConsistencyDelta:
        current.activityConsistency - previous.activityConsistency
})

export const classifyTrend = (
    current: PeriodMetrics,
    previous: PeriodMetrics
): TrendType => {
    const deltas = computeDeltas(current, previous)
    const { stableRange } = progressInsightsConfig.thresholds

    const moodWithinRange =
        Math.abs(deltas.moodDelta) <= stableRange
    const painWithinRange =
        Math.abs(deltas.painDelta) <= stableRange
    const activityWithinRange =
        Math.abs(deltas.activityConsistencyDelta) <= stableRange

    if (
        moodWithinRange
        && painWithinRange
        && activityWithinRange) {
        return 'stable'
    }

    let score = 0
    const {
        moodImprovement,
        painImprovement,
        activityConsistency
    } = progressInsightsConfig.thresholds

    if (deltas.moodDelta >= moodImprovement) {
        score += 1
    } else if (deltas.moodDelta <= -moodImprovement) {
        score -= 1
    }

    if (deltas.painDelta <= painImprovement) {
        score += 1
    } else if (deltas.painDelta >= -painImprovement) {
        score -= 1
    }

    if (deltas.activityConsistencyDelta >= activityConsistency) {
        score += 1
    } else if (
        deltas.activityConsistencyDelta <= -activityConsistency
    ) {
        score -= 1
    }

    if (score >= 2)
        return 'improving'

    if (score <= -2)
        return 'declining'

    return 'mixed'
}
