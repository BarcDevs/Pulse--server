import type {CheckInType} from '../../types/data/CheckInType'
import logger from '../../utils/logger'

import {
    getFallbackContent,
    validateGeneratedInsight
} from './ai-insight-validator'
import type {InsightDecisionResult} from './insight.types'
import {
    buildPromptByType,
    generateTitle
} from './prompts'
import {createProvider} from './providers'

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

    const result = await provider.generateContent({
        prompt
    })

    const generatedContent = result.content

    if (
        !generatedContent
        || generatedContent.trim().length === 0
    ) {
        throw new Error(
            'Failed to generate insight content'
        )
    }

    const title = generateTitle(decision.type)
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