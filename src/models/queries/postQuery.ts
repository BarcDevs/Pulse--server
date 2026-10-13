import type { Prisma as PrismaTypes } from '../../../prisma/generated/prisma/client'
import { PostFilter, type PostQuery } from '../../types/query'

// Content of deactivated (pending-deletion) accounts is hidden everywhere
export const activeAuthorWhere = {
    author: {
        user: {
            active: true
        }
    }
}

// A reply whose author account was purged keeps its text with authorId null
export const activeReplyAuthorWhere = {
    OR: [
        { authorId: null },
        activeAuthorWhere
    ]
}

export const authorSelect = {
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

// The client reads the reply total from _count.replies; it comes from the
// stored Post.replyCount instead of a per-post join against reply authors.
// Replies of accounts pending deletion are counted, though hidden in the thread.
export const withReplyCount = <T extends { replyCount: number }>(
    post: T
) => ({
    ...post,
    _count: {
        ...(post as { _count?: object })._count,
        replies: post.replyCount
    }
})

export const postInclude = (
    type: 'single' | 'multiple',
    options?: { replies?: number }
) => ({
    _count: {
        select: {
            likes: true
        }
    },

    tags: {
        select: {
            id: true,
            name: true,
            nameHe: true,
            slug: true
        }
    },

    author: {
        select: authorSelect
    },

    replies: type === 'single' && {
        where: activeReplyAuthorWhere,
        take: options?.replies,
        include: {
            author: {
                select: authorSelect
            }
        }
    }
})

type RawAuthor = {
    id: string
    image: string | null
    user: {
        id: string
        username: string
        firstName: string
        lastName: string
    }
} | null | undefined

export const DELETED_USER_USERNAME = 'deleted-user'

const deletedAuthor = {
    id: '',
    image: null,
    user: {
        id: '',
        username: DELETED_USER_USERNAME,
        firstName: '',
        lastName: ''
    }
}

export const anonymizeAuthor = <T extends RawAuthor>(
    author: T,
    isAnonymous: boolean
) => {
    if (author === null) return deletedAuthor
    if (!author || !author.user) return author

    if (!isAnonymous) return author

    const { user } = author

    return {
        ...author,
        // A profile photo identifies the author as surely as a name
        image: null,
        user: {
            ...user,
            id: author.id,
            username: `anonymous-${author.id.slice(0, 8)}`,
            firstName: 'Anonymous',
            lastName: ''
        }
    }
}

export const connectTags = (tags: string[]) => ({
    connect: tags.map((tag) => ({ name: tag }))
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
                { category: { contains: searchText, mode: 'insensitive' } },
                {
                    isAnonymous: false,
                    author: {
                        user: {
                            username: { contains: searchText, mode: 'insensitive' }
                        }
                    }
                }
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
                        slug: query.tag
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
                replyCount: 0
            }),

            // additional filter
            ...options?.where
        } as PrismaTypes.PostWhereInput,

        include: postInclude('multiple'),

        // sort by given sort method; id breaks ties so pages and cursors are stable
        orderBy: [
            (
                query?.filter === PostFilter.NEWEST
                    ? { createdAt: 'desc' }
                    : query?.filter === PostFilter.HOT
                        ? { replyCount: 'desc' }
                        : query?.filter === PostFilter.POPULAR
                            ? { views: 'desc' }
                            : { createdAt: 'desc' }
            ),
            { id: 'desc' }
        ] as PrismaTypes.PostOrderByWithRelationInput[]
    }
}
