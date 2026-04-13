import { progressInsightsConfig } from '../../config/progressInsights'
import type { TrendType } from '../../types/data/ProgressInsightType'

import type { TrendMetrics } from './trendClassifier'

export type Highlights = {
    improvements: string[]
    regressions: string[]
}

export const detectHighlights = (
    deltas: TrendMetrics,
    trend: TrendType
): Highlights => {
    const {
        moodImprovement,
        painImprovement,
        activityConsistency
    } = progressInsightsConfig.thresholds

    const improvements: string[] = []
    const regressions: string[] = []

    if (deltas.moodDelta >= moodImprovement) {
        improvements.push('mood improvement')
    } else if (deltas.moodDelta <= -moodImprovement) {
        regressions.push('mood decline')
    }

    if (deltas.painDelta <= painImprovement) {
        improvements.push('pain reduction')
    } else if (deltas.painDelta >= -painImprovement) {
        regressions.push('pain increase')
    }

    if (deltas.activityConsistencyDelta >= activityConsistency) {
        improvements.push('increased activity consistency')
    } else if (
        deltas.activityConsistencyDelta <= -activityConsistency
    ) {
        regressions.push('decreased activity consistency')
    }

    return applyAlignmentRules(
        improvements,
        regressions,
        trend
    )
}

const applyAlignmentRules = (
    improvements: string[],
    regressions: string[],
    trend: TrendType
): Highlights => {
    switch (trend) {
        case 'improving':
            return {
                improvements: improvements.slice(0, 2),
                regressions: regressions.slice(0, 1)
            }
        case 'declining':
            return {
                improvements: improvements.slice(0, 1),
                regressions: regressions.slice(0, 2)
            }
        case 'mixed':
            return {
                improvements,
                regressions
            }
        case 'stable':
            return {
                improvements: [],
                regressions: []
            }
        default:
            return {
                improvements: [],
                regressions: []
            }
    }
}
