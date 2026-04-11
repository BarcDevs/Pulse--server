import { decideInsightType } from '../lib/aiInsight'
import { generateTitle } from '../lib/aiInsight/prompts/insightsPrompts'
import { getFallbackContent } from '../lib/aiInsight/validation/aiInsightValidator'
import * as aiInsightModel from '../models/AIInsightModel'
import { getUserTimezone } from '../models/AuthModel'
import * as checkInModel from '../models/CheckInModel'
import type { CheckInType } from '../types/data/CheckInType'
import logger from '../utils/logger'

import { isFirstCheckIn } from './feedback/helpers'
import { generateInterventionInsight } from './feedback/interventionOrchestrator'
import { generateInsight } from './aiInsightGeneratorService'

const generateBaselineInsight = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userTimezone: string | null
): Promise<void> => {
    const decision = decideInsightType(
        recentCheckIns,
        userTimezone || undefined
    )

    let title: string
    let content: string
    let usedFallback = false

    try {
        const generated = await generateInsight({
            decision,
            checkIns: recentCheckIns,
            userId,
            checkInId
        })
        title = generated.title
        content = generated.content
    } catch (error) {
        usedFallback = true
        const errorMsg = error instanceof Error
            ? error.message
            : 'Unknown error'
        logger.warn(
            'AI generation failed, using fallback',
            {
                userId,
                checkInId,
                insightType: decision.type,
                error: errorMsg
            }
        )
        title = generateTitle(decision.type)
        content = getFallbackContent(decision.type)
    }

    await aiInsightModel.createInsight({
        userId,
        checkInId,
        insightType: decision.type,
        title,
        content,
        classification: 'baseline',
        priority: 'normal',
        metadata: decision.metadata
    })

    logger.info('Insight created', {
        userId,
        checkInId,
        insightType: decision.type,
        usedFallback,
        titleLength: title.length,
        contentLength: content.length
    })
}

const generateInterventionInsightInternal = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userTimezone: string | null
): Promise<void> => {
    const current = recentCheckIns[0]
    const history = recentCheckIns.slice(1)

    // Fetch last intervention insight for mode calculation
    const lastInterventions = await aiInsightModel.getInsightsByUserId(userId, 10)
    const lastIntervention = lastInterventions.find(
        i =>
            (i.metadata?.mode === 'FULL')
            || (i.metadata?.mode === 'SOFT')
            || (i.metadata?.mode === 'SILENT')
    )

    const userLanguage = userTimezone || 'en'

    // Use new orchestrator to generate insight
    const supportMessage = await generateInterventionInsight(
        userId,
        checkInId,
        current,
        history,
        userLanguage,
        lastIntervention || undefined
    )

    if (!supportMessage) {
        return
    }

    // Create intervention insight for all modes
    // SILENT mode has empty message but still tracks intervention
    await aiInsightModel.createInsight({
        userId,
        checkInId,
        insightType: 'BAD_DAY_SUPPORT',
        title: 'Supportive Reflection',
        content: supportMessage.message,
        classification: 'intervention',
        priority: supportMessage.priority,
        metadata: supportMessage.metadata
    })

    logger.info('Intervention insight created', {
        userId,
        checkInId,
        mode: supportMessage.metadata.mode,
        priority: supportMessage.priority,
        primaryReason: supportMessage.metadata.primaryReason,
        aiEnhanced: supportMessage.aiEnhanced,
        fallbackUsed: supportMessage.metadata.fallbackUsed
    })
}

export const generateInsightForCheckIn = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    const recentCheckIns = await checkInModel.getCheckIns(userId, 7)

    if (recentCheckIns.length === 0) {
        logger.warn(
            'No recent check-ins found for insight generation',
            { userId, checkInId }
        )
        return
    }

    const userTimezone = await getUserTimezone(userId)

    await generateBaselineInsight(
        userId,
        checkInId,
        recentCheckIns,
        userTimezone
    )

    // Intervention detection: check for low state and generate supportive message
    if (!isFirstCheckIn(recentCheckIns.slice(1))) {
        await generateInterventionInsightInternal(
            userId,
            checkInId,
            recentCheckIns,
            userTimezone
        )
    }
}
