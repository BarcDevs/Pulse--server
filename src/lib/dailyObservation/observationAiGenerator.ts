import { GeneratedTextKind } from '../../constants/aiInsight/textLimits'
import { createProvider } from '../../services/aiProviders/ProviderFactory'
import type { ObservationType } from '../../types/data/DailyObservationType'
import { retryAsync } from '../aiInsight/retry'
import { validateGeneratedText } from '../aiInsight/validation/generatedTextValidator'
import { sanitizeGeneratedText } from '../aiInsight/validation/validationHelpers'
import { ObservationPromptBuilder } from '../prompts/ObservationPromptBuilder'

type ObservationPayload = {
    observation: string
    supportiveDescription: string
    icon: string
}

type GeneratorInput = {
    type: ObservationType
    topActivity?: string
    language?: string | null
}

const ALLOWED_ICONS = new Set([
    'Activity',
    'CalendarCheck',
    'Flame',
    'Heart',
    'TrendingDown',
    'Zap'
])

const validatePayload = (
    raw: unknown,
    language?: string | null
): ObservationPayload => {
    if (typeof raw !== 'object' || raw === null)
        throw new Error('Invalid JSON structure')

    const obj = raw as Record<string, unknown>

    if (
        typeof obj.observation !== 'string'
        || typeof obj.supportiveDescription !== 'string'
        || typeof obj.icon !== 'string'
    ) throw new Error('Missing required string fields')

    if (
        obj.observation.trim().length === 0
        || obj.supportiveDescription.trim().length === 0
        || obj.icon.trim().length === 0
    ) throw new Error('Empty fields in response')

    const observationCheck = validateGeneratedText(
        GeneratedTextKind.DAILY_OBSERVATION,
        language,
        sanitizeGeneratedText(obj.observation.trim())
    )
    if (!observationCheck.isValid)
        throw new Error(observationCheck.reason)

    const descriptionCheck = validateGeneratedText(
        GeneratedTextKind.DAILY_OBSERVATION_DESCRIPTION,
        language,
        sanitizeGeneratedText(obj.supportiveDescription.trim())
    )
    if (!descriptionCheck.isValid)
        throw new Error(descriptionCheck.reason)

    const icon = obj.icon.trim()
    if (!ALLOWED_ICONS.has(icon))
        throw new Error(`icon '${icon}' is not a valid icon name`)

    return {
        observation: sanitizeGeneratedText(obj.observation.trim()),
        supportiveDescription: sanitizeGeneratedText(obj.supportiveDescription.trim()),
        icon
    }
}

export const generateObservation = async ({
    type,
    topActivity,
    language
}: GeneratorInput): Promise<ObservationPayload> => {
    const prompt = new ObservationPromptBuilder().build(
        { type, topActivity },
        language
    )
    const provider = createProvider()

    const result = await retryAsync(
        () => provider.generateContent({ prompt }),
        { maxRetries: 2, delayMs: 1000 }
    )

    const parsed = JSON.parse(result.content.trim())
    return validatePayload(parsed, language)
}
