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
    const { lowState, ruleResults } = detectLowState(current, history)

    if (!lowState.isLowState) {
        return null
    }

    const intent = createIntent(
        lowState,
        ruleResults,
        previousIntervention
    )

    const context = buildInterventionContext(
        current,
        history,
        intent.trendDuration
    )

    const message = await renderInterventionMessage(
        intent,
        context,
        userLanguage,
        userId
    )

    logInterventionDecision({
        userId,
        checkInId,
        intent,
        message,
        timestamp: new Date().toISOString()
    })

    return message
}

const createIntent = (
    lowState: LowStateResult,
    ruleResults: DetectionRuleResult[],
    previousIntervention?: AIInsightType
): InterventionIntent => {
    const primaryReason = lowState.reasons[0] as LowStateDetectionReason
    const severity = calculateSeverity(ruleResults)
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

const calculateSeverity = (
    ruleResults: DetectionRuleResult[]
): Severity => {
    const triggeredRules = ruleResults.filter(r => r.triggered)

    if (triggeredRules.length === 0) {
        return 'low'
    }

    const maxWeight = Math.max(...triggeredRules.map(r => r.weight), 0)

    if (maxWeight >= 0.75) {
        return 'high'
    }

    if (maxWeight >= 0.45) {
        return 'medium'
    }

    return 'low'
}
