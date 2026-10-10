import {
    aiConfig,
    aiFallbackOrder,
    isProd
} from '../../config'
import {
    buildPromptByType,
    generateTitle
} from '../lib/aiInsight/prompts/insightsPrompts'
import { retryAsync } from '../lib/aiInsight/retry'
import {
    getFallbackContent,
    validateGeneratedInsight
} from '../lib/aiInsight/validation/aiInsightValidator'
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
    const providerChain = buildProviderChain()

    let generatedContent: string | undefined

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

            generatedContent = result.content
            break
        } catch (error) {
            const errorMsg = error instanceof Error
                ? error.message
                : 'Unknown error'
            logger.error(
                `AI generation failed for provider ${providerType}, trying next`,
                {
                    insightType: decision.type,
                    provider: providerType,
                    error: errorMsg
                }
            )
        }
    }

    if (!generatedContent) {
        logger.error(
            'AI generation failed for all providers in chain, using fallback',
            { insightType: decision.type }
        )
        const fallbackContent = getFallbackContent(
            decision.type,
            language
        )
        return {
            title,
            content: fallbackContent
        }
    }

    const trimmedContent = generatedContent.trim()

    const validation = validateGeneratedInsight(
        title,
        trimmedContent
    )

    if (!validation.isValid) {
        logger.warn('Insight validation failed, using fallback', {
            reason: validation.reason,
            insightType: decision.type
        })
        const fallbackContent = getFallbackContent(
            decision.type,
            language
        )
        return {
            title,
            content: fallbackContent
        }
    }

    return {
        title,
        content: trimmedContent
    }
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