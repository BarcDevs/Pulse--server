import type {InsightDecisionResult} from '../lib/aiInsight'
import {
    getFallbackContent,
    validateGeneratedInsight
} from '../lib/aiInsight/aiInsightValidator'
import {
    buildPromptByType,
    generateTitle
} from '../lib/aiInsight/prompts'
import {createProvider} from '../lib/aiInsight/providers'
import {retryAsync} from '../lib/aiInsight/retry'
import type {CheckInType} from '../types/data/CheckInType'
import logger from '../utils/logger'

type GenerateInsightInput = {
    decision: InsightDecisionResult
    checkIns: CheckInType[]
    userId: string
    checkInId: string
}

type GenerateInsightOutput = {
    title: string
    content: string
}

const generateInsight = async (
    input: GenerateInsightInput
): Promise<GenerateInsightOutput> => {
    const {decision, checkIns} = input

    const prompt = buildPromptByType(
        decision.type,
        checkIns,
        decision.metadata
    )

    const provider = createProvider()
    const title = generateTitle(decision.type)

    let generatedContent: string = ''

    try {
        // Retry with: max 2 retries, 1000ms delay = 3 total attempts
        const result = await retryAsync(
            () => provider.generateContent({prompt}),
            {maxRetries: 2, delayMs: 1000}
        )

        generatedContent = result.content

        if (
            !generatedContent
            || generatedContent.trim().length === 0
        ) {
            throw new Error(
                'Failed to generate insight content'
            )
        }
    } catch (error) {
        // After retries exhausted, use fallback
        const errorMsg = error instanceof Error
            ? error.message
            : 'Unknown error'
        logger.error(
            'AI generation failed after retries, using fallback',
            {
                insightType: decision.type,
                error: errorMsg
            }
        )
        const fallbackContent = getFallbackContent(
            decision.type
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
            decision.type
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

export {generateInsight}
export type {
    GenerateInsightInput,
    GenerateInsightOutput
}