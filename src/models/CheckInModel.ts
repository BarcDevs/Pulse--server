import type {
    CheckInType,
    NewCheckInType,
    UpsertCheckInResult
} from '../types/data/CheckInType'
import Prisma from '../utils/PrismaClient'

export const getCheckIns = async (
    userId: string,
    limit = 10
): Promise<CheckInType[]> =>
    (await Prisma.dailyCheckIn.findMany({
        where: {userId},
        take: limit,
        orderBy: {
            checkInDate: 'desc'
        },
        include: {
            insights: true
        }
    })) as CheckInType[]

export const upsertCheckIn = async (
    data: NewCheckInType,
    checkInDate: Date
): Promise<UpsertCheckInResult> => {
    const {userId, ...checkInData} = data

    const checkIn = (await Prisma.dailyCheckIn.upsert({
        where: {
            userId_checkInDate: {
                userId,
                checkInDate
            }
        },
        create: {
            ...checkInData,
            checkInDate,
            user: {
                connect: {
                    id: userId
                }
            }
        },
        update: {
            ...checkInData,
            updatedAt: new Date()
        },
        include: {
            insights: true
        }
    })) as CheckInType

    return {checkIn, created: checkIn.updatedAt === null}
}

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
): Promise<Pick<
    CheckInType,
    'moodScore' |
    'painLevel' |
    'activities' |
    'checkInDate'
>[]> =>
    Prisma.dailyCheckIn.findMany({
        where: {userId},
        select: {
            moodScore: true,
            painLevel: true,
            activities: true,
            checkInDate: true
        },
        orderBy: {checkInDate: 'desc'},
        take: 30
    })
