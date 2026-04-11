type InsightType =
    | 'MOOD_DROP_ALERT'
    | 'MOTIVATIONAL'
    | 'WEEKLY_SUMMARY'
    | 'BAD_DAY_SUPPORT'

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
