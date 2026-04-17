import type {
    AIInsightType,
    CreateAIInsightInput
} from '../types/data/CheckInType'
import Prisma from '../utils/prismaClient'

export const createInsight = async (
    input: CreateAIInsightInput
): Promise<AIInsightType> => {
    const {
        userId,
        checkInId,
        insightType,
        title,
        content,
        classification = 'baseline',
        priority = 'normal',
        metadata
    } = input

    return (await Prisma.aIInsight.upsert({
        where: {
            checkInId_type: {
                checkInId,
                type: insightType
            }
        },
        create: {
            userId,
            checkInId,
            type: insightType,
            title,
            content,
            classification,
            priority,
            ...(metadata && { metadata })
        },
        update: {
            title,
            content,
            classification,
            priority,
            ...(metadata && { metadata })
        }
    })) as AIInsightType
}

export const getInsightsByUserId = async (
    userId: string,
    limit = 10
): Promise<AIInsightType[]> =>
    (await Prisma.aIInsight
        .findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        })) as AIInsightType[]

export const getInsightByCheckInId = async (
    checkInId: string
): Promise<AIInsightType | null> =>
    (await Prisma.aIInsight.findFirst({
        where: { checkInId },
        orderBy: { createdAt: 'desc' }
    })) as AIInsightType | null