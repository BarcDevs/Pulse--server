import type { TrendType } from '../../types/data/ProgressInsightType'

import type { PeriodMetrics } from './metricAggregator'

export const generateFallbackSummary = (
    current: PeriodMetrics,
    previous: PeriodMetrics,
    trend: TrendType
): string => {
    const currentMood = current.averageMood.toFixed(1)
    const previousMood = previous.averageMood.toFixed(1)
    const currentPain = current.averagePain.toFixed(1)
    const currentActivity = Math.round(
        current.activityConsistency * 100
    )

    switch (trend) {
        case 'improving':
            return (
                `Your mood improved this week, averaging ${currentMood} compared to ${previousMood}. 
                Activity consistency increased to ${currentActivity}%.`
            )

        case 'declining':
            return (
                `Your mood declined this week to ${currentMood} from ${previousMood}. 
                Pain increased to ${currentPain}.`
            )

        case 'stable':
            return (
                `Your recovery remains stable this week. 
                Mood averaged ${currentMood}, consistent with the previous period.`
            )

        case 'mixed':
            return (
                `Your recovery shows mixed signals this week. 
                Mood is now ${currentMood} while pain changed to ${currentPain}.`
            )

        default:
            return (
                `Your recovery remains stable this week. 
                Mood averaged ${currentMood}, consistent with the previous period.`
            )
    }
}
