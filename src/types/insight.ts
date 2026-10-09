type InsightType =
    | 'MOOD_DROP_ALERT'
    | 'MOTIVATIONAL'
    | 'WEEKLY_SUMMARY'
    | 'BAD_DAY_SUPPORT'

// Raw numbers over all check-ins, so the prompt can mention a streak longer than the 7 check-ins it receives
type InsightStats = {
    currentStreak: number
    longestStreak: number
    totalCheckIns: number
}

type InsightDecisionMetadata = {
    currentStreak?: number
    moodTrend?: number[]
    checkInCount?: number
    stats?: InsightStats
}

type InsightDecisionResult = {
    type: InsightType
    reason: string
    metadata?: InsightDecisionMetadata
}

export type {
    InsightDecisionMetadata,
    InsightDecisionResult,
    InsightStats,
    InsightType
}
