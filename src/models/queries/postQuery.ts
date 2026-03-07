import type {Prisma as PrismaTypes} from '../../../prisma/generated/prisma/client'
import {PostFilter, type PostQuery} from '../../types/query'

export const postInclude = (
    type: 'single' | 'multiple'
) => ( {
    // add replies count
    _count: {
        select: {
            replies: true
        }
    },

    // include tags name and id
    tags: {
        select: {
            id: true,
            name: true
        }
    },

    // include author basic info
    author: {
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
                select: {
                    image: true
                }
            }
        }
    },

    // include replies for single post
    replies: type === 'single' && {
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profile: {
                        select: {
                            image: true
                        }
                    }
                }
            }
        }
    }
} )

export const connectTags = (tags: string[]) => ( {
    connectOrCreate: tags.map((tag) => ( {
        where: {
            name: tag
        },
        create: {
            name: tag
        }
    } ))
} )

export const postQueryBuilder = (
    query?: PostQuery,
    options?: {
        where?: PrismaTypes.PostWhereInput
    }
) => {
    const searchText = query?.search?.trim()
    const searchQuery = searchText
        ? {
            title: {
                contains: searchText,
                mode: 'insensitive'
            },
            body: {
                contains: searchText,
                mode: 'insensitive'
            }
        }
        : {}

    return {
        where: {
            // make sure author is an active account
            author: {
                active: true
            },

            // filter by tag
            tags: {
                some: {
                    name: query?.tag
                }
            },

            // filter by category
            category: query?.category,

            // filter by search
            ...searchQuery,

            // filter by unanswered
            ...( query?.filter === PostFilter.UNANSWERED && {
                replies: {
                    none: true
                }
            } ),

            // additional filter
            ...options?.where
        } as PrismaTypes.PostWhereInput,

        include: postInclude('multiple'),

        // sort by given sort method
        orderBy: (
            query?.filter === PostFilter.NEWEST
                ? {
                    createdAt: 'desc'
                }
                : query?.filter === PostFilter.HOT
                    ? {
                        replies: {
                            _count: 'desc'
                        }
                    }
                    : query?.filter === PostFilter.POPULAR
                        ? {
                            views: 'desc'
                        }
                        : {
                            createdAt: 'desc'
                        } ) as PrismaTypes.PostOrderByWithRelationInput
    }
}
