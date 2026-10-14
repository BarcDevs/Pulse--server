import { FeedbackPromptBuilder } from '../../lib/prompts/FeedbackPromptBuilder'
import type {
    InterventionContext,
    InterventionIntent
} from '../../types/feedback'
import logger from '../../utils/logger'
import { createProvider } from '../aiProviders/ProviderFactory'

type MessageParts = {
    acknowledge: string
    normalize: string
    suggest?: string
}

export const renderWithAI = async (
    intent: InterventionIntent,
    context: InterventionContext,
    userLanguage: string
): Promise<MessageParts | null> => {
    try {
        const prompt = new FeedbackPromptBuilder().build(
            { intent, context },
            userLanguage
        )
        const provider = createProvider()

        const response = await provider.generateContent({ prompt })
        return parseAIResponse(
            response.content,
            intent.mode
        )
    } catch (error) {
        logger.error(
            'AI message rendering failed',
            {
                reason: intent.primaryReason,
                severity: intent.severity,
                error: error instanceof Error
                    ? error.message
                    : 'Unknown error'
            }
        )
        
        return null
    }
}

const parseAIResponse = (
    content: string,
    mode: 'FULL' | 'SOFT' | 'SILENT'
): MessageParts | null => {
    try {
        const jsonMatch = content.match(/\{[\s\S]*}/)
        if (!jsonMatch)
            return null

        const parsed = JSON.parse(jsonMatch[0])

        if (!parsed.acknowledge || !parsed.normalize)
            return null

        return {
            acknowledge: parsed.acknowledge,
            normalize: parsed.normalize,
            suggest: mode === 'FULL'
                ? parsed.suggest
                : undefined
        }
    } catch {
        return null
    }
}