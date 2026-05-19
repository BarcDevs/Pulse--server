import type { Prisma as PrismaTypes } from '../../../prisma/generated/prisma/client'
import { PostFilter, type PostQuery } from '../../types/query'

export const postInclude = (
    type: 'single' | 'multiple'
) => ({
    _count: {
        select: {
            replies: true
        }
    },

    tags: {
        select: {
            id: true,
            name: true
        }
    },

    author: {
        select: {
            id: true,
            image: true,
            user: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true
                }
            }
        }
    },

    replies: type === 'single' && {
        include: {
            author: {
                select: {
                    id: true,
                    image: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    }
})

export const connectTags = (tags: string[]) => ({
    connectOrCreate: tags.map((tag) => ({
        where: {
            name: tag
        },
        create: {
            name: tag,
            slug: tag.toLowerCase().replace(/\s+/g, '-')
        }
    }))
})

export const postQueryBuilder = (
    query?: PostQuery,
    options?: {
        where?: PrismaTypes.PostWhereInput
    }
) => {
    const searchText = query?.search?.trim()
    const searchQuery = searchText
        ? {
            OR: [
                { title: { contains: searchText, mode: 'insensitive' } },
                { body: { contains: searchText, mode: 'insensitive' } },
                { tags: { some: { name: { contains: searchText, mode: 'insensitive' } } } },
                { author: { user: { username: { contains: searchText, mode: 'insensitive' } } } },
                { author: { user: { firstName: { contains: searchText, mode: 'insensitive' } } } },
                { author: { user: { lastName: { contains: searchText, mode: 'insensitive' } } } }
            ]
        }
        : {}

    return {
        where: {
            author: {
                user: {
                    active: true
                }
            },

            // filter by tag
            ...(query?.tag && {
                tags: {
                    some: {
                        name: query.tag
                    }
                }
            }),

            // filter by category
            ...(query?.category && {
                category: query.category
            }),

            // filter by search
            ...searchQuery,

            // filter by unanswered
            ...(query?.filter === PostFilter.UNANSWERED && {
                replies: {
                    none: {}
                }
            }),

            // additional filter
            ...options?.where
        } as PrismaTypes.PostWhereInput,

        include: postInclude('multiple'),

        // sort by given sort method
        orderBy: (
            query?.filter === PostFilter.NEWEST
                ? { createdAt: 'desc' }
                : query?.filter === PostFilter.HOT
                    ? { replies: { _count: 'desc' } }
                    : query?.filter === PostFilter.POPULAR
                        ? { views: 'desc' }
                        : { createdAt: 'desc' }
        ) as PrismaTypes.PostOrderByWithRelationInput
    }
}
