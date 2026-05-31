import { monthInMs } from '../constants/time'
import * as dailyObservationCache from '../lib/cache/dailyObservationCache'
import { generateObservation } from '../lib/dailyObservation/observationAiGenerator'
import { detectObservationType } from '../lib/dailyObservation/observationDetectors'
import { getObservationTemplate } from '../lib/dailyObservation/observationTemplates'
import { getMessages } from '../locales'
import { getUserLanguage } from '../models/authModel'
import * as checkInModel from '../models/checkInModel'
import type { TodayObservationResponse } from '../types/data/DailyObservationType'
import logger from '../utils/logger'

const getTopActivity = (
    checkIns: { activities: string[] }[]
): string | undefined => {
    const counts: Record<string, number> = {}
    for (const checkIn of checkIns) {
        for (const activity of checkIn.activities) {
            counts[activity] = (counts[activity] ?? 0) + 1
        }
    }
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
    return sorted[0]?.[0]
}

export const getTodayObservation = async (
    userId: string
): Promise<TodayObservationResponse | null> => {
    const [{ id: profileId, timezone }, language] = await Promise.all([
        checkInModel.getProfileContext(userId),
        getUserLanguage(userId)
    ])

    const cached = dailyObservationCache.get(userId, timezone)
    if (cached !== undefined) return cached

    const since = new Date(Date.now() - monthInMs)
    const checkIns = await checkInModel
        .getCheckInsForStats(profileId, since)

    const detection = detectObservationType(checkIns)

    if (!detection) {
        dailyObservationCache.set(
            userId,
            timezone,
            null
        )
        return null
    }

    const { type } = detection
    const topActivity = getTopActivity(checkIns)

    let payload: {
        observation: string
        supportiveDescription: string
        icon: string
    }

    try {
        payload = await generateObservation({
            type,
            topActivity,
            language
        })
    } catch (error) {
        logger.warn('Observation AI generation failed, using template fallback', {
            userId,
            type,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        payload = getObservationTemplate(type)
    }

    const result: TodayObservationResponse = {
        title: getMessages(language).observation.title,
        type,
        ...payload
    }

    dailyObservationCache.set(
        userId,
        timezone,
        result
    )
    return result
}
