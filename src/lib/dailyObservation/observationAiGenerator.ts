import { createProvider } from '../../services/aiProviders/ProviderFactory'
import type { ObservationType } from '../../types/data/DailyObservationType'
import { retryAsync } from '../aiInsight/retry'

import { buildObservationPrompt } from './observationPrompt'

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

const OBSERVATION_MAX = 120
const DESCRIPTION_MAX = 140

const validatePayload = (raw: unknown): ObservationPayload => {
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

    if (obj.observation.length > OBSERVATION_MAX)
        throw new Error(`observation exceeds ${OBSERVATION_MAX} characters`)

    if (obj.supportiveDescription.length > DESCRIPTION_MAX)
        throw new Error(`supportiveDescription exceeds ${DESCRIPTION_MAX} characters`)

    return {
        observation: obj.observation.trim(),
        supportiveDescription: obj.supportiveDescription.trim(),
        icon: obj.icon.trim()
    }
}

export const generateObservation = async ({
    type,
    topActivity,
    language
}: GeneratorInput): Promise<ObservationPayload> => {
    const prompt = buildObservationPrompt({
        type,
        topActivity,
        language
    })
    const provider = createProvider()

    const result = await retryAsync(
        () => provider.generateContent({ prompt }),
        { maxRetries: 2, delayMs: 1000 }
    )

    const parsed = JSON.parse(result.content.trim())
    return validatePayload(parsed)
}
