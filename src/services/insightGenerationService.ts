import { isGoodCheckIn } from '../lib/aiInsight/decision/goodCheckInDetector'
import { decideInsightType } from '../lib/aiInsight/decision/InsightDecision'
import { generateTitle } from '../lib/aiInsight/prompts/insightsPrompts'
import { getFallbackContent } from '../lib/aiInsight/validation/aiInsightValidator'
import { calculateStreaks } from '../lib/checkInStats'
import { getMessages } from '../locales'
import * as aiInsightModel from '../models/aiInsightModel'
import {
    getUserLanguage,
    getUserShareNotesWithAI,
    getUserTimezone
} from '../models/authModel'
import * as checkInModel from '../models/checkInModel'
import type { CheckInType } from '../types/data/CheckInType'
import type {
    InsightDecisionResult,
    InsightStats,
    InsightType
} from '../types/insight'
import type { WriteGuard } from '../types/writeGuard'
import { alwaysWrite } from '../types/writeGuard'
import logger from '../utils/logger'

import { isFirstCheckIn } from './feedback/helpers'
import { generateInterventionInsight } from './feedback/interventionOrchestrator'
import { generateInsight } from './aiInsightGeneratorService'

const getInsightStats = async (
    profileId: string,
    userTimezone: string | null
): Promise<InsightStats> => {
    const dates = await checkInModel.getCheckInDates(profileId)

    return {
        ...calculateStreaks(dates, userTimezone || undefined),
        totalCheckIns: dates.length
    }
}

const storeInsight = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userLanguage: string,
    decision: InsightDecisionResult,
    canWrite: WriteGuard
): Promise<void> => {
    let title: string
    let content: string
    let usedFallback = false

    try {
        const generated = await generateInsight({
            decision,
            checkIns: recentCheckIns,
            userId,
            checkInId,
            language: userLanguage
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
        title = generateTitle(decision.type, userLanguage)
        content = getFallbackContent(decision.type, userLanguage)
    }

    if (!await canWrite()) {
        logger.warn('Insight dropped, job superseded', {
            userId,
            checkInId,
            insightType: decision.type
        })
        return
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

// The decision only sees the 7 latest check-ins; the stats carry the streak over all of them
const generateBaselineInsight = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userTimezone: string | null,
    userLanguage: string,
    stats: InsightStats,
    canWrite: WriteGuard
): Promise<InsightType> => {
    const decision = decideInsightType(
        recentCheckIns,
        userTimezone || undefined
    )

    await storeInsight(
        userId,
        checkInId,
        recentCheckIns,
        userLanguage,
        { ...decision, metadata: { ...decision.metadata, stats } },
        canWrite
    )

    return decision.type
}

const generateMotivationalInsight = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userLanguage: string,
    stats: InsightStats,
    canWrite: WriteGuard
): Promise<void> => {
    await storeInsight(
        userId,
        checkInId,
        recentCheckIns,
        userLanguage,
        {
            type: 'MOTIVATIONAL',
            reason: 'Good check-in',
            metadata: {
                currentStreak: stats.currentStreak,
                checkInCount: recentCheckIns.length,
                stats
            }
        },
        canWrite
    )
}

const generateInterventionInsightInternal = async (
    userId: string,
    checkInId: string,
    recentCheckIns: CheckInType[],
    userTimezone: string | null,
    userLanguage: string,
    canWrite: WriteGuard
): Promise<boolean> => {
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

    const supportMessage = await generateInterventionInsight(
        userId,
        checkInId,
        current,
        history,
        userLanguage,
        lastIntervention || undefined
    )

    if (!supportMessage) {
        return false
    }

    const interventionTitle = getMessages(userLanguage)
        .insights.titles.BAD_DAY_SUPPORT

    if (!await canWrite()) {
        logger.warn('Intervention insight dropped, job superseded', {
            userId,
            checkInId
        })
        return false
    }

    // SILENT mode has empty message but still tracks intervention
    await aiInsightModel.createInsight({
        userId,
        checkInId,
        insightType: 'BAD_DAY_SUPPORT',
        title: interventionTitle,
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

    return true
}

export const generateInsightForCheckIn = async (
    userId: string,
    checkInId: string,
    canWrite: WriteGuard = alwaysWrite
): Promise<void> => {
    const profileId = await checkInModel.getProfileIdForUser(userId)
    const recentCheckIns = await checkInModel.getCheckIns(profileId, 7)

    if (recentCheckIns.length === 0) {
        logger.warn(
            'No recent check-ins found for insight generation',
            { userId, checkInId }
        )
        return
    }

    const [userTimezone, userLanguage, shareNotesWithAI] = await Promise.all([
        getUserTimezone(userId),
        getUserLanguage(userId),
        getUserShareNotesWithAI(userId)
    ])

    // Opted-out users' notes never reach an AI path; local analysis
    // elsewhere still uses them
    const checkInsForAI = shareNotesWithAI
        ? recentCheckIns
        : recentCheckIns.map((checkIn) => ({ ...checkIn, notes: null }))

    const stats = await getInsightStats(profileId, userTimezone)

    const baselineType = await generateBaselineInsight(
        userId,
        checkInId,
        checkInsForAI,
        userTimezone,
        userLanguage,
        stats,
        canWrite
    )

    const producedTypes: InsightType[] = [baselineType]

    // A good check-in also gets encouragement, unless the baseline already is the motivational one
    if (
        isGoodCheckIn(recentCheckIns[0])
        && baselineType !== 'MOTIVATIONAL'
    ) {
        await generateMotivationalInsight(
            userId,
            checkInId,
            checkInsForAI,
            userLanguage,
            stats,
            canWrite
        )
        producedTypes.push('MOTIVATIONAL')
    }

    if (!isFirstCheckIn(recentCheckIns.slice(1))) {
        const hasIntervention = await generateInterventionInsightInternal(
            userId,
            checkInId,
            checkInsForAI,
            userTimezone,
            userLanguage,
            canWrite
        )

        if (hasIntervention) {
            producedTypes.push('BAD_DAY_SUPPORT')
        }
    }

    // Regenerating after an edit must not leave insights from the previous
    // version of this check-in (e.g. an old bad-day message) next to the new ones.
    // A superseded job wrote nothing, so it must not delete anything either
    if (!await canWrite()) return

    await aiInsightModel.deleteInsightsExceptTypes(checkInId, producedTypes)
}
