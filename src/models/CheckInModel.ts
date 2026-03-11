import type {
    CheckInType,
    NewCheckInType,
    UpdateCheckInType
} from '../types/data/CheckInType'
import Prisma from '../utils/PrismaClient'

export const getCheckIns = async (
    userId: string,
    limit = 30
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: {userId},
        take: limit,
        orderBy: {checkInDate: 'desc'},
        include: {insights: true}
    })) as CheckInType[]

export const findTodayCheckIn = async (
    userId: string,
    checkInDate: Date
): Promise<CheckInType | null> =>
    (await Prisma.dailyCheckIn.findUnique({
        where: {
            userId_checkInDate: {
                userId,
                checkInDate
            }
        },
        include: {insights: true}
    })) as CheckInType | null

export const createCheckIn = async (
    data: NewCheckInType,
    checkInDate: Date,
    createdAt?: Date
): Promise<CheckInType> => {
    const {userId, ...checkInData} = data

    return (await Prisma.dailyCheckIn.create({
        data: {
            ...checkInData,
            checkInDate,
            createdAt: createdAt ?? new Date(),
            user: {connect: {id: userId}}
        },
        include: {insights: true}
    })) as CheckInType
}

export const updateCheckIn = async (
    userId: string,
    checkInDate: Date,
    data: Omit<UpdateCheckInType, 'userId'>,
    updatedAt?: Date
): Promise<CheckInType> =>
    (await Prisma.dailyCheckIn.update({
        where: {
            userId_checkInDate: {
                userId,
                checkInDate
            }
        },
        data: {
            ...data,
            updatedAt: updatedAt ?? new Date()
        },
        include: {insights: true}
    })) as CheckInType

export const updateUserLastCheckIn = async (
    userId: string
): Promise<void> => {
    await Prisma.user.update({
        where: {id: userId},
        data: {lastCheckInAt: new Date()}
    })
}

export const getCheckInsForStats = async (
    userId: string
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
        where: {userId},
        select: {
            moodScore: true,
            painLevel: true,
            activities: true,
            checkInDate: true
        },
        orderBy: {checkInDate: 'desc'}
    })