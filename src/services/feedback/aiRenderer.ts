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
        const prompt = buildAIPrompt(
            intent,
            context,
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

const buildAIPrompt = (
    intent: InterventionIntent,
    context: InterventionContext,
    userLanguage: string
): string => {
    const severityLabel = {
        low: 'mild',
        medium: 'moderate',
        high: 'significant'
    }[intent.severity]

    const fullStructure = {
        acknowledge: 'string',
        normalize: 'string',
        suggest: 'string'
    }

    const softStructure = {
        acknowledge: 'string',
        normalize: 'string'
    }

    const structure = intent.mode === 'FULL'
        ? fullStructure
        : softStructure
    const structureJson = JSON.stringify(
        structure,
        null,
        2
    )

    const reasonText = intent.primaryReason
        .replace(/_/g, ' ')
        .toLowerCase()

    return `You are a compassionate health support assistant.
    Generate a supportive message for a user 
    experiencing a ${severityLabel} ${reasonText}.

CONSTRAINTS:
- Language: ${userLanguage}
- Tone: supportive, non-clinical (no medical claims), concise, non-judgmental
- Return ONLY valid JSON with this exact structure:
${structureJson}

CONTEXT:
- Trend direction: ${context.trend.direction} 
  over ${context.trend.duration} day(s)
- Recent patterns: ${context.highlights
        .map(h => h.type)
        .join(', ')
    || 'stable'}

MESSAGE STRUCTURE:
- acknowledge: Validate their experience (1 sentence)
- normalize: Normalize their struggle as part of recovery (1 sentence)
${intent.mode === 'FULL'
        ? '- suggest: Offer gentle guidance (1 sentence, optional)'
        : ''}

Generate the message now:`
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