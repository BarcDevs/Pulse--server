import type {
    CheckInType,
    NewCheckInType,
    UpdateCheckInType
} from '../types/data/CheckInType'
import Prisma from '../utils/PrismaClient'

export const getProfileIdForUser = async (
    userId: string
): Promise<string> => {
    const profile = await Prisma.profile
        .findUnique({
            where: { userId }
        })

    if (!profile)
        throw new Error(
            `Profile not found for user ${userId}`
        )

    return profile.id
}

export const getCheckIns = async (
    profileId: string,
    limit = 30
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: { profileId },
        take: limit,
        orderBy: { checkInDate: 'desc' },
        include: { insights: true }
    })) as CheckInType[]

export const findTodayCheckIn = async (
    profileId: string,
    checkInDate: Date
): Promise<CheckInType | null> =>
    (await Prisma.dailyCheckIn.findUnique({
        where: {
            profileId_checkInDate: {
                profileId,
                checkInDate
            }
        },
        include: { insights: true }
    })) as CheckInType | null

export const createCheckIn = async (
    data: NewCheckInType,
    checkInDate: Date,
    createdAt?: Date
): Promise<CheckInType> => {
    const { userId, ...checkInData } = data
    const profileId = await getProfileIdForUser(userId)

    return (await Prisma.dailyCheckIn.create({
        data: {
            ...checkInData,
            checkInDate,
            createdAt: createdAt ?? new Date(),
            profile: { connect: { id: profileId } }
        },
        include: { insights: true }
    })) as CheckInType
}

export const updateCheckIn = async (
    profileId: string,
    checkInDate: Date,
    data: Omit<UpdateCheckInType, 'userId'>,
    updatedAt?: Date
): Promise<CheckInType> =>
    (await Prisma.dailyCheckIn.update({
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
        include: { insights: true }
    })) as CheckInType

export const updateUserLastCheckIn = async (
    userId: string
): Promise<void> => {
    await Prisma.profile.update({
        where: { userId },
        data: { lastCheckInAt: new Date() }
    })
}

export const getCheckInsForStats = async (
    profileId: string
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
        where: { profileId },
        select: {
            moodScore: true,
            painLevel: true,
            activities: true,
            checkInDate: true
        },
        orderBy: { checkInDate: 'desc' }
    })
