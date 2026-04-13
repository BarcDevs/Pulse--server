export const progressInsightsConfig = {
    version: 'v1',
    thresholds: {
        moodImprovement: 0.5,
        painImprovement: -0.5,
        activityConsistency: 0.2,
        stableRange: 0.25
    }
} as const
