type InsightType =
    'MOOD_DROP_ALERT' |
    'MOTIVATIONAL' |
    'WEEKLY_SUMMARY'

type InsightDecisionMetadata = {
    currentStreak?: number
    moodTrend?: number[]
    checkInCount?: number
}

type InsightDecisionResult = {
    type: InsightType
    reason: string
    metadata?: InsightDecisionMetadata
}

export type {
    InsightDecisionMetadata,
    InsightDecisionResult,
    InsightType
}
