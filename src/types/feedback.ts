import type { CheckInType } from './data/CheckInType'

export type LowStateDetectionReason =
    | 'LOW_MOOD'
    | 'HIGH_PAIN'
    | 'NEGATIVE_TREND'

export type DetectionRuleResult = {
    triggered: boolean
    reason?: LowStateDetectionReason
    weight: number
    metadata?: Record<string, any>
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

// Tone rules (shared by AI + fallback)
export type ToneRules = {
    supportive: true
    nonClinical: true
    concise: true
    nonJudgmental: true
}

// Locale message structure (language-specific)
export type LocaleMessages = Record<
    LowStateDetectionReason,
    Record<
        Severity,
        {
            acknowledge: string[]
            normalize: string[]
            suggest?: string[]
        }
    >
>

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

export type MessageTemplate = {
    intro: string
    validation: string
}
