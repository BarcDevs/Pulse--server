import type {
    Prisma as PrismaTypes
} from '../../prisma/generated/prisma/client'
import type { PostType } from '../types/data/PostType'
import type {
    PostRecommendationItem,
    RecommendationSnapshot
} from '../types/data/RecommendationType'
import Prisma from '../utils/PrismaClient'

import { postInclude } from './queries/postQuery'

export const saveSnapshot = async (
    userId: string,
    checkInId: string,
    items: PostRecommendationItem[]
): Promise<void> => {
    await Prisma.postRecommendation.upsert({
        where: { checkInId },
        create: {
            userId,
            checkInId,
            items,
            generatedAt: new Date(),
            generationPending: false
        },
        update: {
            items,
            generatedAt: new Date(),
            generationPending: false,
            pendingSince: null
        }
    })
}

export const getLatestSnapshot = async (
    userId: string
): Promise<RecommendationSnapshot | null> => {
    const snapshot = await Prisma.postRecommendation.findFirst({
        where: { userId },
        orderBy: { generatedAt: 'desc' },
        include: {
            checkIn: {
                select: { id: true }
            }
        }
    })

    if (!snapshot) return null

    return {
        items: snapshot.items as PostRecommendationItem[],
        generatedAt: snapshot.generatedAt,
        basedOnCheckInId: snapshot.checkInId
    }
}

export const getSnapshotWithFlags = async (
    checkInId: string
): Promise<{
    snapshot: RecommendationSnapshot | null
    generationPending: boolean
    pendingSince: Date | null
}> => {
    const rec = await Prisma.postRecommendation.findUnique({
        where: { checkInId }
    })

    if (!rec) {
        return {
            snapshot: null,
            generationPending: false,
            pendingSince: null
        }
    }

    return {
        snapshot: {
            items: rec.items as PostRecommendationItem[],
            generatedAt: rec.generatedAt,
            basedOnCheckInId: rec.checkInId
        },
        generationPending: rec.generationPending,
        pendingSince: rec.pendingSince
    }
}

export const setPendingGeneration = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    await Prisma.postRecommendation.upsert({
        where: { checkInId },
        create: {
            userId,
            checkInId,
            items: [],
            generationPending: true,
            pendingSince: new Date()
        },
        update: {
            generationPending: true,
            pendingSince: new Date()
        }
    })
}

export const getCandidatePosts = async (
    categories: string[],
    tagNames: string[],
    searchTerms: string[],
    limit: number = 50
): Promise<PostType[]> => {
    const whereConditions: PrismaTypes.PostWhereInput[] = []

    if (categories.length > 0) {
        whereConditions.push({
            category: { in: categories }
        })
    }

    if (tagNames.length > 0) {
        whereConditions.push({
            tags: {
                some: { name: { in: tagNames } }
            }
        })
    }

    if (searchTerms.length > 0) {
        const searchCondition: PrismaTypes.PostWhereInput = {
            OR: searchTerms.map((term) => ({
                OR: [
                    { title: { contains: term, mode: 'insensitive' as const } },
                    { body: { contains: term, mode: 'insensitive' as const } }
                ]
            }))
        }
        whereConditions.push(searchCondition)
    }

    return (
        await Prisma.post.findMany({
            where: {
                author: { user: { active: true } },
                ...(whereConditions.length > 0 && {
                    OR: whereConditions
                })
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: postInclude('multiple')
        })
    ) as unknown as PostType[]
}
