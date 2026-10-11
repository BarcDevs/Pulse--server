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
import * as checkInAiJobModel from '../models/checkInAiJobModel'
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
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

// The check-in is already saved when this runs: a queue failure must not fail
// the request. Without a job the check-in simply reads as 'ready' with no insights.
const queueAiJob = async (
    checkInId: string,
    userId: string
): Promise<void> => {
    try {
        await checkInAiJobModel.enqueueJob(checkInId, userId)
    } catch (err: unknown) {
        logger.error('Failed to queue check-in AI job', {
            userId,
            checkInId,
            error: toLoggableError(err)
        })
    }
}

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

        await queueAiJob(existing.id, data.userId)

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
        await queueAiJob(checkIn.id, data.userId)

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
            await queueAiJob(checkIn!.id, data.userId)
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
    await queueAiJob(existing.id, userId)

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