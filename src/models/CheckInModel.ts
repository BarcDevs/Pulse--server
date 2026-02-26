import type {CheckInType, NewCheckInType} from '../types/data/CheckInType'
import Prisma from '../utils/PrismaClient'

export const getCheckIns = async (
    userId: string,
    limit = 10
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: {userId},
        take: limit,
        orderBy: {createdAt: 'desc'},
        include: {insights: true}
    })) as CheckInType[]

export const createCheckIn = async (
    data: NewCheckInType
): Promise<CheckInType> => {
    const {userId, ...checkInData} = data

    return (
        await Prisma.dailyCheckIn.create({
            data: {
                ...checkInData,
                user: {
                    connect: {id: userId}
                }
            },
            include: {insights: true}
        })) as CheckInType
}

export const updateUserLastCheckIn = async (userId: string): Promise<void> => {
    await Prisma.user.update({
        where: {id: userId},
        data: {lastCheckInAt: new Date()}
    })
}

export const getCheckInsForStats = async (
    userId: string
): Promise<Pick<
    CheckInType,
    'moodScore' |
    'painLevel' |
    'activities' |
    'createdAt'
>[]> =>
    Prisma.dailyCheckIn.findMany({
        where: {userId},
        select: {
            moodScore: true,
            painLevel: true,
            activities: true,
            createdAt: true
        },
        orderBy: {createdAt: 'desc'},
        take: 30
    })