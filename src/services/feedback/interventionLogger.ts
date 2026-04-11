import type {
    InterventionIntent,
    SupportiveMessage
} from '../../types/feedback'
import logger from '../../utils/logger'

type LogInterventionDecisionParams = {
    userId: string
    checkInId: string
    intent: InterventionIntent
    message: SupportiveMessage
    timestamp: string
}

export const logInterventionDecision = (
    params: LogInterventionDecisionParams
): void => {
    const silentModeUsed = params.intent.mode === 'SILENT'
    const engagementRiskFlag = silentModeUsed ? 'MONITOR' : undefined

    logger.info('Intervention decision', {
        userId: params.userId,
        checkInId: params.checkInId,
        primaryReason: params.intent.primaryReason,
        severity: params.intent.severity,
        mode: params.intent.mode,
        trendDuration: params.intent.trendDuration,
        priority: params.message.priority,
        aiEnhanced: params.message.aiEnhanced,
        fallbackUsed: params.message.metadata.fallbackUsed,
        aiUsed: params.message.metadata.aiUsed,
        timestamp: params.timestamp,
        silentModeUsed,
        engagementRiskFlag,
        toneMismatchRisk: (
            !params.message.aiEnhanced
            && params.message.metadata.fallbackUsed
        )
    })
}
