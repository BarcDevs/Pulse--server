import {decideInsightType} from '../lib/aiInsight'
import {generateTitle} from '../lib/aiInsight/prompts/insightsPrompts'
import {
    getFallbackContent,
} from '../lib/aiInsight/validation/aiInsightValidator'
import * as aiInsightModel from '../models/AIInsightModel'
import * as checkInModel from '../models/CheckInModel'
import {getUserTimezone} from '../models/AuthModel'
import logger from '../utils/logger'
import {generateInsight} from './aiInsightGeneratorService'

const generateInsightForCheckIn = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    const recentCheckIns = await checkInModel
        .getCheckIns(userId, 7)

    if (recentCheckIns.length === 0) {
        logger.warn(
            'No recent check-ins found for insight generation',
            {userId, checkInId}
        )
        return
    }

    const userTimezone = await getUserTimezone(userId)
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

export {generateInsightForCheckIn}