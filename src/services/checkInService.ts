import { Prisma } from '../../prisma/generated/prisma/client'
import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    resolveCheckInDate,
    resolveTimestampInUserTimeZone
} from '../lib/checkInDateHelpers'
import {
    calculateAverageMood,
    calculateAveragePain,
    calculateStreaks,
    calculateTopActivities
} from '../lib/checkInStats'
import * as checkInModel from '../models/checkInModel'
import {
    getProfileContext,
    getProfileIdForUser
} from '../models/checkInModel'
import type {
    CheckInStatsType,
    CheckInType,
    NewCheckInType,
    UpdateCheckInType
} from '../types/data/CheckInType'
import type { CheckInQuery } from '../types/query'

import { generateInsightSafely } from './insightService'
import { generateRecommendationsSafely } from './recommendationsService'

export const getCheckIns = async (
    userId: string,
    query?: CheckInQuery
): Promise<CheckInType[]> => {
    const profileId = await getProfileIdForUser(userId)

    return checkInModel.getCheckIns(
        profileId,
        query?.limit
    )
}

export const createCheckIn = async (
    data: NewCheckInType
): Promise<{
    checkIn: CheckInType
    created: boolean
}> => {
    const { id: profileId, timezone } =
        await getProfileContext(data.userId)
    const checkInDate = resolveCheckInDate(timezone)
    const createdAt = resolveTimestampInUserTimeZone(timezone)

    const existing = await checkInModel
        .findTodayCheckIn(profileId, checkInDate)

    if (existing) {
        const { userId: _userId, ...updateData } = data
        await checkInModel.updateCheckIn(
            profileId,
            checkInDate,
            updateData,
            createdAt
        )

        await generateInsightSafely(data.userId, existing.id)
        await generateRecommendationsSafely(data.userId, existing.id)

        const checkIn = await checkInModel
            .findTodayCheckIn(profileId, checkInDate)

        return { checkIn: checkIn!, created: false }
    }

    try {
        const checkIn = await checkInModel.createCheckIn(
            data,
            profileId,
            checkInDate,
            createdAt
        )

        await checkInModel.updateUserLastCheckIn(data.userId)
        await generateInsightSafely(data.userId, checkIn.id)
        await generateRecommendationsSafely(data.userId, checkIn.id)

        const checkInWithInsights = await checkInModel
            .findTodayCheckIn(profileId, checkInDate)

        return { checkIn: checkInWithInsights!, created: true }
    } catch (err: unknown) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError
            && err.code === 'P2002'
        ) {
            const { userId: _userId, ...updateData } = data
            await checkInModel.updateCheckIn(
                profileId,
                checkInDate,
                updateData,
                createdAt
            )
            const checkIn = await checkInModel
                .findTodayCheckIn(profileId, checkInDate)
            await generateInsightSafely(data.userId, checkIn!.id)
            await generateRecommendationsSafely(data.userId, checkIn!.id)
            return { checkIn: checkIn!, created: false }
        }
        throw err
    }
}

export const updateCheckIn = async (
    data: UpdateCheckInType
): Promise<CheckInType> => {
    const { id: profileId, timezone } =
        await getProfileContext(data.userId)
    const checkInDate = resolveCheckInDate(timezone)
    const updatedAt = resolveTimestampInUserTimeZone(timezone)

    const existing = await checkInModel
        .findTodayCheckIn(profileId, checkInDate)

    if (!existing)
        throw errorFactory.generic.notFound(`Today's check-in`)

    const { userId, ...updateData } = data

    await checkInModel.updateCheckIn(
        profileId,
        checkInDate,
        updateData,
        updatedAt
    )
    await checkInModel.updateUserLastCheckIn(userId)
    await generateInsightSafely(userId, existing.id)
    await generateRecommendationsSafely(userId, existing.id)

    const fetchedCheckIn = await checkInModel
        .findTodayCheckIn(profileId, checkInDate)
    return fetchedCheckIn!
}

export const getCheckInStats = async (
    userId: string
): Promise<CheckInStatsType> => {
    const {
        id: profileId,
        timezone
    } = await getProfileContext(userId)

    const checkIns = await checkInModel
        .getCheckInsForStats(profileId)

    const totalCheckIns = checkIns.length

    return {
        totalCheckIns,
        averageMoodScore: calculateAverageMood(checkIns),
        averagePainLevel: calculateAveragePain(checkIns),
        topActivities: calculateTopActivities(checkIns),
        ...calculateStreaks(
            checkIns.map((c) => c.checkInDate),
            timezone
        )
    }
}