import {errorFactory} from '../errors/factory'
import {
    resolveDate,
    resolveTimestampInUserTimeZone
} from '../lib/checkInDateHelpers'
import {
    calculateAverageMood,
    calculateAveragePain,
    calculateStreaks,
    calculateTopActivities
} from '../lib/checkInStats'
import * as authModel from '../models/AuthModel'
import * as checkInModel from '../models/CheckInModel'
import type {
    CheckInStatsType,
    CheckInType,
    NewCheckInType,
    UpdateCheckInType
} from '../types/data/CheckInType'
import type {CheckInQuery} from '../types/query'
import {Prisma} from '../utils/PrismaClient'

import {generateInsightSafely} from './insightService'

export const getCheckIns = async (
    userId: string,
    query?: CheckInQuery
): Promise<CheckInType[]> =>
    checkInModel.getCheckIns(
        userId,
        query?.limit
    )

export const createCheckIn = async (
    data: NewCheckInType
): Promise<{
    checkIn: CheckInType
    created: boolean
}> => {
    const checkInDate =
        await resolveDate(data.userId)
    const userTimezone = await authModel
        .getUserTimezone(data.userId)
    const createdAt = resolveTimestampInUserTimeZone(
        userTimezone
    )

    const existing = await checkInModel
        .findTodayCheckIn(
            data.userId,
            checkInDate
        )

    if (existing) {
        const {userId, ...updateData} = data
        await checkInModel.updateCheckIn(
            userId,
            checkInDate,
            updateData,
            createdAt
        )

        await generateInsightSafely(
            data.userId,
            existing.id
        )

        // Re-fetch with insights loaded
        const checkIn = await checkInModel
            .findTodayCheckIn(userId, checkInDate)

        return {
            checkIn: checkIn!,
            created: false
        }
    }

    try {
        const checkIn = await checkInModel
            .createCheckIn(
                data,
                checkInDate,
                createdAt
            )

        await checkInModel
            .updateUserLastCheckIn(data.userId)

        await generateInsightSafely(
            data.userId,
            checkIn.id
        )

        const checkInWithInsights = await checkInModel
            .findTodayCheckIn(
                data.userId,
                checkInDate
            )

        return {
            checkIn: checkInWithInsights!,
            created: true
        }
    } catch (err) {
        const isUniqueConstraint = (
            err instanceof
            Prisma.PrismaClientKnownRequestError
            && err.code === 'P2002'
        )

        if (isUniqueConstraint)
            throw errorFactory.generic.conflict(`Today's check-in`)
        throw err
    }
}

export const updateCheckIn = async (
    data: UpdateCheckInType
): Promise<CheckInType> => {
    const checkInDate = await resolveDate(
        data.userId
    )
    const userTimezone = await authModel
        .getUserTimezone(data.userId)
    const updatedAt =
        resolveTimestampInUserTimeZone(
            userTimezone
        )

    const existing = await checkInModel
        .findTodayCheckIn(
            data.userId,
            checkInDate
        )

    if (!existing)
        throw errorFactory.generic.notFound(
            `Today's check-in`
        )

    const {userId, ...updateData} = data

    await checkInModel.updateCheckIn(
        userId,
        checkInDate,
        updateData,
        updatedAt
    )

    await checkInModel.updateUserLastCheckIn(userId)

    await generateInsightSafely(
        userId,
        existing.id
    )

    const fetchedCheckIn =
        await checkInModel.findTodayCheckIn(
            userId,
            checkInDate
        )
    return fetchedCheckIn!
}

export const getCheckInStats = async (
    userId: string
): Promise<CheckInStatsType> => {
    const checkIns = await checkInModel
        .getCheckInsForStats(userId)

    const totalCheckIns = checkIns.length

    return {
        totalCheckIns,
        averageMoodScore: calculateAverageMood(checkIns),
        averagePainLevel: calculateAveragePain(checkIns),
        topActivities: calculateTopActivities(checkIns),
        ...calculateStreaks(
            checkIns.map((c) => c.checkInDate)
        )
    }
}