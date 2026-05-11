import type { CheckInType } from './data/CheckInType'

export type LowStateDetectionReason =
    | 'LOW_MOOD'
    | 'HIGH_PAIN'
    | 'NEGATIVE_TREND'

export type LowMoodMetadata = {
    moodScore: number
}

export type HighPainMetadata = {
    painLevel: number
}

export type NegativeTrendMetadata = {
    moodDelta: number
    painDelta: number
    trendDuration: number
}

export type DetectionRuleResult = {
    triggered: boolean
    reason?: LowStateDetectionReason
    weight: number
    metadata?: (
        | LowMoodMetadata
        | HighPainMetadata
        | NegativeTrendMetadata
    )
}

export type LowStateResult = {
    isLowState: boolean
    reasons: LowStateDetectionReason[]
    trendDuration: number
    deltas?: {
        moodDelta?: number
        painDelta?: number
    }
}

export type InterventionMode = 'FULL' | 'SOFT' | 'SILENT'

export type Severity = 'low' | 'medium' | 'high'

// Deterministic Intent (Detection Engine output)
export type InterventionIntent = {
    primaryReason: LowStateDetectionReason
    severity: Severity
    mode: InterventionMode
    trendDuration: number
}

// Deterministic Context (language-agnostic)
export type InterventionContext = {
    recentCheckIns: CheckInType[]
    trend: {
        direction: 'up' | 'down' | 'stable'
        duration: number
    }
    highlights: Array<{
        type: 'consistency' | 'spike' | 'drop' | 'recovery'
        value: number
    }>
}

// Updated SupportiveMessage (tracks AI usage)
export type SupportiveMessage = {
    type: 'support'
    priority: 'elevated' | 'high'
    message: string
    aiEnhanced: boolean
    metadata: {
        primaryReason: LowStateDetectionReason
        severity: Severity
        mode: InterventionMode
        trendDuration: number
        fallbackUsed: boolean
        aiUsed: boolean
    }
}

// Intervention insight metadata (from new orchestrator + renderer)
export type InterventionInsightMetadata = {
    primaryReason: LowStateDetectionReason
    severity: Severity
    mode: InterventionMode
    trendDuration: number
    fallbackUsed: boolean
    aiUsed: boolean
}

// Legacy metadata type (for backwards compatibility with existing code)
export type InterventionMetadata = {
    reasons: LowStateDetectionReason[]
    primaryReason: LowStateDetectionReason
    mode: InterventionMode
    trendDuration: number
    deltas?: {
        moodDelta?: number
        painDelta?: number
    }
    consecutiveOccurrences: number
    fallbackUsed?: boolean
}

