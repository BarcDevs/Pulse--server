import { CheckInAiJobStatus } from '../../prisma/generated/prisma/enums'
import { errorFactory } from '../errors/factory/ErrorFactory'
import type {
    CheckInType,
    NewCheckInType,
    UpdateCheckInType
} from '../types/data/CheckInType'
import Prisma from '../utils/prismaClient'

import { findProfileContext } from './profileModel'

const checkInInclude = {
    insights: true,
    aiJob: { select: { status: true } }
} as const

type CheckInRow = Omit<CheckInType, 'insightsStatus'> & {
    aiJob: { status: CheckInAiJobStatus } | null
}

// Insights are generated after the check-in is returned; a queued or running
// job means the client should keep polling. No job (older check-ins) or a
// finished/failed one means nothing more will arrive.
const toCheckIn = ({ aiJob, ...checkIn }: CheckInRow): CheckInType => ({
    ...checkIn,
    insightsStatus:
        aiJob?.status === CheckInAiJobStatus.PENDING
        || aiJob?.status === CheckInAiJobStatus.RUNNING
            ? 'pending'
            : 'ready'
})

const mapOptional = (row: CheckInRow | null): CheckInType | null =>
    row ? toCheckIn(row) : null

export const getProfileIdForUser = async (
    userId: string
): Promise<string> => {
    const profile = await findProfileContext(userId)

    if (!profile)
        throw errorFactory.generic.notFound('Profile')

    return profile.id
}

export const getProfileContext = async (
    userId: string
): Promise<{ id: string; timezone: string }> => {
    const profile = await findProfileContext(userId)

    if (!profile)
        throw errorFactory.generic.notFound('Profile')

    return profile
}

export const getCheckIns = async (
    profileId: string,
    limit = 30
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: { profileId },
        take: limit,
        orderBy: { checkInDate: 'desc' },
        include: checkInInclude
    }) as CheckInRow[]).map(toCheckIn)

export const findCheckInById = async (
    checkInId: string
): Promise<CheckInType | null> =>
    mapOptional(await Prisma.dailyCheckIn.findUnique({
        where: { id: checkInId },
        include: checkInInclude
    }) as CheckInRow | null)

export const findTodayCheckIn = async (
    profileId: string,
    checkInDate: Date
): Promise<CheckInType | null> =>
    mapOptional(await Prisma.dailyCheckIn.findUnique({
        where: {
            profileId_checkInDate: {
                profileId,
                checkInDate
            }
        },
        include: checkInInclude
    }) as CheckInRow | null)

export const createCheckIn = async (
    data: NewCheckInType,
    profileId: string,
    checkInDate: Date,
    createdAt?: Date
): Promise<CheckInType> => {
    const { userId: _userId, ...checkInData } = data

    return toCheckIn(await Prisma.dailyCheckIn.create({
        data: {
            ...checkInData,
            checkInDate,
            createdAt: createdAt ?? new Date(),
            profile: { connect: { id: profileId } }
        },
        include: checkInInclude
    }) as CheckInRow)
}

export const updateCheckIn = async (
    profileId: string,
    checkInDate: Date,
    data: Omit<UpdateCheckInType, 'userId'>,
    updatedAt?: Date
): Promise<CheckInType> =>
    toCheckIn(await Prisma.dailyCheckIn.update({
        where: {
            profileId_checkInDate: {
                profileId,
                checkInDate
            }
        },
        data: {
            ...data,
            updatedAt: updatedAt ?? new Date()
        },
        include: checkInInclude
    }) as CheckInRow)

export const updateUserLastCheckIn = async (
    userId: string
): Promise<void> => {
    await Prisma.profile.update({
        where: { userId },
        data: { lastCheckInAt: new Date() }
    })
}

// Dates only, so streak stats over every check-in stay cheap
export const getCheckInDates = async (
    profileId: string
): Promise<Date[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: { profileId },
        select: { checkInDate: true }
    })).map((checkIn) => checkIn.checkInDate)

export const getCheckInsForStats = async (
    profileId: string,
    since?: Date
): Promise<
    Pick<
        CheckInType,
        'moodScore' |
        'painLevel' |
        'activities' |
        'checkInDate'
    >[]
> =>
    Prisma.dailyCheckIn.findMany({
        where: {
            profileId,
            ...(since && { checkInDate: { gte: since } })
        },
        select: {
            moodScore: true,
            painLevel: true,
            activities: true,
            checkInDate: true
        },
        orderBy: { checkInDate: 'desc' }
    })

export const getCheckInsForDateRange = async (
    profileId: string,
    startDate: Date,
    endDate: Date
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: {
            profileId,
            checkInDate: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { checkInDate: 'desc' },
        include: checkInInclude
    }) as CheckInRow[]).map(toCheckIn)
