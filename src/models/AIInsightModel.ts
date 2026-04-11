import type { InsightType } from '../../prisma/generated/prisma/enums'
import type {
    AIInsightType,
    CreateAIInsightInput
} from '../types/data/CheckInType'
import type { InsightDecisionMetadata } from '../types/insight'
import Prisma from '../utils/PrismaClient'

const createInsight = async (
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

    const upsertData = {
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
    }

    return (await Prisma.aIInsight.upsert(
        upsertData
    )) as AIInsightType
}

const getInsightsByUserId = async (
    userId: string,
    limit = 10
): Promise<AIInsightType[]> =>
    (await Prisma.aIInsight
        .findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        })) as AIInsightType[]

const getInsightByCheckInId = async (
    checkInId: string
): Promise<AIInsightType | null> =>
    (await Prisma.aIInsight.findFirst({
        where: { checkInId },
        orderBy: { createdAt: 'desc' }
    })) as AIInsightType | null

export {
    createInsight,
    getInsightByCheckInId,
    getInsightsByUserId
}
export type { CreateAIInsightInput }
