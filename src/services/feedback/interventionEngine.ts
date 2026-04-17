import { FEEDBACK_DETECTION } from '../../constants/feedback/detection'
import type { CheckInType } from '../../types/data/CheckInType'
import type {
    DetectionRuleResult,
    LowStateDetectionReason,
    LowStateResult
} from '../../types/feedback'

import {
    calculateBaselineMood,
    calculateBaselinePain,
    calculateTrendDuration
} from './helpers'

type NegativeTrendMetadata = {
    moodDelta: number
    painDelta: number
    trendDuration: number
}

export const detectLowMood = (
    current: CheckInType
): DetectionRuleResult => {
    const triggered = (
        current.moodScore <= FEEDBACK_DETECTION.MOOD.THRESHOLD
    )

    let weight = 0
    if (triggered) {
        const rawWeight = (
            FEEDBACK_DETECTION.MOOD.THRESHOLD - current.moodScore
        ) / FEEDBACK_DETECTION.MOOD.WEIGHT_DIVISOR
        weight = Math.max(
            FEEDBACK_DETECTION.MOOD.WEIGHT_MIN,
            Math.min(FEEDBACK_DETECTION.MOOD.WEIGHT_MAX, rawWeight)
        )
    }

    return {
        triggered,
        reason: triggered ? 'LOW_MOOD' : undefined,
        weight,
        metadata: triggered
            ? { moodScore: current.moodScore }
            : undefined
    }
}

export const detectHighPain = (
    current: CheckInType
): DetectionRuleResult => {
    const triggered = (
        current.painLevel >= FEEDBACK_DETECTION.PAIN.THRESHOLD
    )

    let weight = 0
    if (triggered) {
        const rawWeight = (
            current.painLevel - FEEDBACK_DETECTION.PAIN.THRESHOLD
        ) / FEEDBACK_DETECTION.PAIN.WEIGHT_DIVISOR
        weight = Math.max(
            FEEDBACK_DETECTION.PAIN.WEIGHT_MIN,
            Math.min(FEEDBACK_DETECTION.PAIN.WEIGHT_MAX, rawWeight)
        )
    }

    return {
        triggered,
        reason: triggered ? 'HIGH_PAIN' : undefined,
        weight,
        metadata: triggered
            ? { painLevel: current.painLevel }
            : undefined
    }
}

export const detectNegativeTrend = (
    current: CheckInType,
    history: CheckInType[]
): DetectionRuleResult => {
    if (history.length === 0) {
        return { triggered: false, weight: 0 }
    }

    const baselineMood = calculateBaselineMood(history)
    const baselinePain = calculateBaselinePain(history)
    const moodDelta = baselineMood - current.moodScore
    const painDelta = current.painLevel - baselinePain

    const triggered = (
        moodDelta >= FEEDBACK_DETECTION.TREND.DELTA_THRESHOLD
        || painDelta >= FEEDBACK_DETECTION.TREND.DELTA_THRESHOLD
    )

    let weight = 0
    if (triggered) {
        const rawWeight = (
            Math.max(moodDelta, painDelta)
            / FEEDBACK_DETECTION.TREND.WEIGHT_DIVISOR
        )
        weight = Math.max(
            FEEDBACK_DETECTION.TREND.WEIGHT_MIN,
            Math.min(FEEDBACK_DETECTION.TREND.WEIGHT_MAX, rawWeight)
        )
    }

    return {
        triggered,
        reason: triggered ? 'NEGATIVE_TREND' : undefined,
        weight,
        metadata: triggered
            ? {
                moodDelta,
                painDelta,
                trendDuration: calculateTrendDuration(
                    history,
                    current
                )
            } : undefined
    }
}

export type DetectionOutput = {
    lowState: LowStateResult
    ruleResults: DetectionRuleResult[]
}

export const detectLowState = (
    current: CheckInType,
    history: CheckInType[]
): DetectionOutput => {
    const ruleResults: DetectionRuleResult[] = [
        detectLowMood(current),
        detectHighPain(current),
        detectNegativeTrend(current, history)
    ]

    const triggeredRules = ruleResults.filter(r => r.triggered)

    if (triggeredRules.length === 0) {
        return {
            lowState: {
                isLowState: false,
                reasons: [],
                trendDuration: 0
            },
            ruleResults
        }
    }

    const deltas: Record<string, number> = {}
    triggeredRules.forEach(r => {
        if (r.metadata && 'moodDelta' in r.metadata) {
            const metadata = r.metadata as NegativeTrendMetadata
            deltas.moodDelta = metadata.moodDelta
        }
        if (r.metadata && 'painDelta' in r.metadata) {
            const metadata = r.metadata as NegativeTrendMetadata
            deltas.painDelta = metadata.painDelta
        }
    })

    const trendDuration = (
        triggeredRules.find(r => r.reason === 'NEGATIVE_TREND')
            ?.metadata as NegativeTrendMetadata | undefined
    )?.trendDuration || 1

    return {
        lowState: {
            isLowState: true,
            reasons: triggeredRules.map(
                r => r.reason as LowStateDetectionReason
            ),
            trendDuration,
            deltas: Object.keys(deltas).length > 0
                ? deltas : undefined
        },
        ruleResults
    }
}
