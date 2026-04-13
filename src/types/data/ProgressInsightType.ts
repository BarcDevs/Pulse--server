export type TrendType = 'improving' | 'declining' | 'stable' | 'mixed'

export type ProgressInsightMetadata = {
    moodDelta: number
    painDelta: number
    activityConsistency: number
}

export type ProgressInsightHighlights = {
    improvements: string[]
    regressions: string[]
}

export type ProgressInsightPeriod = {
    currentStart: Date
    currentEnd: Date
    previousStart: Date
    previousEnd: Date
}

export type ProgressInsight = {
    summary: string
    trend: TrendType
    highlights: ProgressInsightHighlights
    period: ProgressInsightPeriod
    metadata?: ProgressInsightMetadata
}
