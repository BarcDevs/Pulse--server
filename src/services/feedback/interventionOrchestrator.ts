import type {
    AIInsightType,
    CheckInType
} from '../../types/data/CheckInType'
import type {
    DetectionRuleResult,
    InterventionIntent,
    InterventionMode,
    LowStateDetectionReason,
    LowStateResult,
    Severity,
    SupportiveMessage
} from '../../types/feedback'

import { buildInterventionContext } from './contextBuilder'
import { detectLowState } from './interventionEngine'
import { logInterventionDecision } from './interventionLogger'
import { calculateInterventionMode } from './interventionSuppression'
import { renderInterventionMessage } from './messageRenderer'

export const generateInterventionInsight = async (
    userId: string,
    checkInId: string,
    current: CheckInType,
    history: CheckInType[],
    userLanguage: string,
    previousIntervention?: AIInsightType
): Promise<SupportiveMessage | null> => {
    // Layer 1: Detect low state
    const { lowState, ruleResults } = detectLowState(current, history)

    if (!lowState.isLowState) {
        return null
    }

    // Create intervention intent from detection output
    const intent = createIntent(lowState, ruleResults, previousIntervention)

    // Layer 2: Build intervention context (language-agnostic)
    const context = buildInterventionContext(current, history, intent.trendDuration)

    // Layer 3: Render message (dual-layer: AI + fallback)
    const message = await renderInterventionMessage(
        intent,
        context,
        userLanguage,
        userId
    )

    // Log the decision
    logInterventionDecision({
        userId,
        checkInId,
        intent,
        message,
        timestamp: new Date().toISOString()
    })

    return message
}

// Create InterventionIntent from detection output
const createIntent = (
    lowState: LowStateResult,
    ruleResults: DetectionRuleResult[],
    previousIntervention?: AIInsightType
): InterventionIntent => {
    const primaryReason = lowState.reasons[0] as LowStateDetectionReason
    const severity = calculateSeverity(ruleResults)

    // Calculate mode (respects consecutive count from previous interventions)
    const mode: InterventionMode = calculateInterventionMode(
        lowState,
        previousIntervention
    )

    return {
        primaryReason,
        severity,
        mode,
        trendDuration: lowState.trendDuration
    }
}

// Calculate severity from rule weights with smooth transitions
const calculateSeverity = (
    ruleResults: DetectionRuleResult[]
): Severity => {
    const triggeredRules = ruleResults.filter(r => r.triggered)

    if (triggeredRules.length === 0) {
        return 'low'
    }

    const maxWeight = Math.max(...triggeredRules.map(r => r.weight), 0)

    // Smoothed thresholds to avoid sharp tone shifts
    // 0.75+ high, 0.45-0.75 medium, <0.45 low
    if (maxWeight >= 0.75) {
        return 'high'
    }

    if (maxWeight >= 0.45) {
        return 'medium'
    }

    return 'low'
}
