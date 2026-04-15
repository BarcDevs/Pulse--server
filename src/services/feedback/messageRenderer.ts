import type {
    InterventionContext,
    InterventionIntent,
    SupportiveMessage
} from '../../types/feedback'
import logger from '../../utils/logger'

import { renderWithAI } from './aiRenderer'
import { renderFallback } from './fallbackRenderer'
import { assembleMessage } from './messageAssembler'

export const renderInterventionMessage = async (
    intent: InterventionIntent,
    context: InterventionContext,
    userLanguage: string,
    userId?: string
): Promise<SupportiveMessage> => {
    try {
        const aiMessage = await renderWithAI(
            intent,
            context,
            userLanguage
        )

        if (aiMessage) {
            const priority = intent.severity === 'high'
                ? 'high'
                : 'elevated'

            return {
                type: 'support',
                priority,
                message: assembleMessage(aiMessage, intent.mode),
                aiEnhanced: true,
                metadata: {
                    primaryReason: intent.primaryReason,
                    severity: intent.severity,
                    mode: intent.mode,
                    trendDuration: intent.trendDuration,
                    fallbackUsed: false,
                    aiUsed: true
                }
            }
        }
    } catch (error) {
        logger.warn('AI rendering failed, falling back to locale', {
            error: error instanceof Error
                ? error.message
                : 'Unknown error',
            intent,
            userLanguage
        })
    }

    const localeMessage = renderFallback(
        intent,
        context,
        userLanguage,
        userId
    )

    const priority = intent.severity === 'high'
        ? 'high'
        : 'elevated'

    return {
        type: 'support',
        priority,
        message: assembleMessage(localeMessage, intent.mode),
        aiEnhanced: false,
        metadata: {
            primaryReason: intent.primaryReason,
            severity: intent.severity,
            mode: intent.mode,
            trendDuration: intent.trendDuration,
            fallbackUsed: true,
            aiUsed: false
        }
    }
}