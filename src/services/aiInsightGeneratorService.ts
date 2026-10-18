import {
    aiConfig,
    aiFallbackOrder,
    isProd
} from '../../config'
import { GeneratedTextKind } from '../constants/aiInsight/textLimits'
import { INSIGHT_GENERATION_ATTEMPTS } from '../constants/aiInsight/validation'
import {
    buildPromptByType,
    generateTitle
} from '../lib/aiInsight/prompts/insightsPrompts'
import { retryAsync } from '../lib/aiInsight/retry'
import {
    getFallbackContent,
    validateGeneratedInsight
} from '../lib/aiInsight/validation/aiInsightValidator'
import { sanitizeGeneratedText } from '../lib/aiInsight/validation/validationHelpers'
import type {
    CheckInType
} from '../types/data/CheckInType'
import type { InsightDecisionResult } from '../types/insight'
import logger from '../utils/logger'

import {
    createProviderByType,
    getApiKeyForProvider,
    type ProviderType
} from './aiProviders/ProviderFactory'

export type GenerateInsightInput = {
    decision: InsightDecisionResult
    checkIns: CheckInType[]
    userId: string
    checkInId: string
    language?: string | null
}

export type GenerateInsightOutput = {
    title: string
    content: string
}

export const generateInsight = async (
    input: GenerateInsightInput
): Promise<GenerateInsightOutput> => {
    const {
        decision,
        checkIns,
        language
    } = input

    const prompt = buildPromptByType(
        decision.type,
        checkIns,
        language,
        decision.metadata
    )

    const title = generateTitle(decision.type, language)

    let lastReason: string | undefined

    for (let attempt = 1; attempt <= INSIGHT_GENERATION_ATTEMPTS; attempt++) {
        const generatedContent = await generateFromChain(
            prompt,
            decision.type
        )

        if (!generatedContent)
            break

        const content = sanitizeGeneratedText(generatedContent.trim())
        const validation = validateGeneratedInsight(
            GeneratedTextKind[decision.type],
            language,
            title,
            content
        )

        if (validation.isValid)
            return { title, content }

        lastReason = validation.reason
        logger.warn('Insight validation failed', {
            reason: validation.reason,
            length: content.length,
            insightType: decision.type,
            attempt
        })
    }

    logger.warn('Using fallback insight', {
        insightType: decision.type,
        ...(lastReason && { reason: lastReason })
    })

    return {
        title,
        content: getFallbackContent(decision.type, language)
    }
}

// Tries each provider in the chain; the first usable reply wins.
const generateFromChain = async (
    prompt: string,
    insightType: InsightDecisionResult['type']
): Promise<string | undefined> => {
    const providerChain = buildProviderChain()

    for (const providerType of providerChain) {
        try {
            const provider = createProviderByType(providerType)
            const result = await retryAsync(
                () => provider.generateContent({ prompt }),
                { maxRetries: 1, delayMs: 1000 }
            )

            if (
                !result.content
                || result.content.trim().length === 0
            ) {
                throw new Error('Failed to generate insight content')
            }

            return result.content
        } catch (error) {
            const errorMsg = error instanceof Error
                ? error.message
                : 'Unknown error'
            logger.error(
                `AI generation failed for provider ${providerType}, trying next`,
                {
                    insightType,
                    provider: providerType,
                    error: errorMsg
                }
            )
        }
    }

    logger.error(
        'AI generation failed for all providers in chain',
        { insightType }
    )

    return undefined
}

const hasApiKeyForProvider = (providerType: ProviderType): boolean =>
    Boolean(getApiKeyForProvider(providerType))

const buildProviderChain = (): ProviderType[] => {
    // Render forces NODE_ENV=production on preview builds, which also
    // merges in config/production.ts (provider: openai + fallbackOrder).
    // isProd is resolved from APP_ENV, so preview correctly falls back to
    // plain google-lite here instead of inheriting the prod chain.
    if (!isProd) {
        return ['google']
    }

    const primary = (aiConfig.provider as ProviderType) || 'google'
    const chain = [
        primary,
        ...aiFallbackOrder as ProviderType[]
    ]
    const seen = new Set<ProviderType>()
    const dedup: ProviderType[] = []

    for (const providerType of chain) {
        if (seen.has(providerType)) continue
        seen.add(providerType)
        if (!hasApiKeyForProvider(providerType)) {
            logger.warn(
                `AI provider ${providerType} skipped: no API key configured`,
                { provider: providerType }
            )
            continue
        }
        dedup.push(providerType)
    }

    return dedup
}