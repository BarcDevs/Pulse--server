import { Prisma } from '../../prisma/generated/prisma/client'
import {
    GUEST_CHECK_IN_LIMIT,
    GUEST_CHECK_IN_LIMIT_MESSAGE
} from '../constants/auth/authRules'
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

type CheckInOptions = {
    isGuest?: boolean
}

// Bounds the AI cost of anonymous sessions; the client turns the 403 into
// the save-your-account prompt. Only a check-in for a new day counts: a guest
// at the limit can still edit today's
export const assertGuestCheckInAllowance = async (
    profileId: string
): Promise<void> => {
    const checkInCount =
        await checkInModel.countCheckIns(profileId)

    if (checkInCount >= GUEST_CHECK_IN_LIMIT)
        throw errorFactory.auth.forbidden(
            GUEST_CHECK_IN_LIMIT_MESSAGE
        )
}

// A guest gets insights for the first submission only: every edit would queue
// another AI run, and guests cost nothing to create
const queueAiJobUnlessGuest = (
    checkInId: string,
    userId: string,
    options: CheckInOptions
): Promise<void> =>
    options.isGuest
        ? Promise.resolve()
        : queueAiJob(
            checkInId,
            userId
        )

export const createCheckIn = async (
    data: NewCheckInType,
    options: CheckInOptions = {}
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

    if (
        options.isGuest
        && !existing
    )
        await assertGuestCheckInAllowance(profileId)

    if (existing) {
        const { userId: _userId, ...updateData } = data
        await checkInModel.updateCheckIn(
            profileId,
            checkInDate,
            updateData,
            createdAt
        )

        await queueAiJobUnlessGuest(
            existing.id,
            data.userId,
            options
        )

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
            await queueAiJobUnlessGuest(
                checkIn!.id,
                data.userId,
                options
            )
            return { checkIn: checkIn!, created: false }
        }
        throw err
    }
}

export const updateCheckIn = async (
    data: UpdateCheckInType,
    options: CheckInOptions = {}
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
    await queueAiJobUnlessGuest(
        existing.id,
        userId,
        options
    )

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