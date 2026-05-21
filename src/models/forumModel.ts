import type { Prisma as PrismaTypes } from '../../prisma/generated/prisma/client'
import type {
    NewPostType,
    PostType,
    UpdatePostType
} from '../types/data/PostType'
import type {
    NewReplyType,
    ReplyType,
    UpdateReplyType
} from '../types/data/ReplyType'
import type { TagType } from '../types/data/TagType'
import type { PostQuery } from '../types/query'
import Prisma from '../utils/prismaClient'

import {
    connectTags,
    postInclude,
    postQueryBuilder
} from './queries/postQuery'

type RawTag = { id: string; name: string; nameHe: string; slug: string; description?: string | null; createdAt?: Date; _count?: { posts: number; followers: number } }

const mapTag = (raw: RawTag): TagType => ({
    id: raw.id,
    label: { en: raw.name, he: raw.nameHe },
    slug: raw.slug,
    ...(raw.description != null && { description: raw.description }),
    ...(raw.createdAt && { createdAt: raw.createdAt }),
    ...(raw._count && { _count: raw._count })
})

export const getPosts = async (query?: PostQuery):
    Promise<PostType[]> => {
    const postQuery = postQueryBuilder(query)

    return (
        await Prisma.post.findMany({
            take: query?.limit || 10,
            skip:
                (query?.page ? query.page - 1 : 0)
                * (query?.limit || 10),
            ...postQuery
        })
    ) as unknown as PostType[]
}

export const getPostsCount = async (
    query?: PostQuery
): Promise<{count: number}> => {
    const postQuery =
        query
            ? postQueryBuilder(query)
            : {}

    return {
        count: await Prisma.post.count({
            ...postQuery
        })
    } as {count: number}
}

export const getPost = async (id: string):
    Promise<PostType | null> =>
    (await Prisma.post.findUnique({
        where: {
            id,
            author: {
                user: {
                    active: true
                }
            }
        },
        include: postInclude('single')
    })) as PostType | null

export const createPost = async (post: NewPostType):
    Promise<PostType> => {
    const {
        authorId,
        tags,
        ...postData
    } = post

    return (await Prisma.post.create({
        data: {
            ...postData,
            author: {
                connect: {
                    id: authorId
                }
            },
            tags: {
                ...connectTags(tags || [])
            }
        } as PrismaTypes.PostCreateInput,
        include: postInclude('single')
    })) as unknown as PostType
}

export const updatePost = async (
    id: string,
    post: UpdatePostType,
    removeTags?: Array<{ id: string }>
): Promise<PostType> =>
    (await Prisma.post.update({
        where: {
            id
        },
        data: {
            ...post,
            tags: {
                disconnect: removeTags?.map(
                    (tag) => ({ id: tag.id })
                ),
                ...connectTags(post.tags || [])
            }
        },
        include: postInclude('single')
    })) as unknown as PostType

export const deletePost = async (id: string) =>
    Prisma.post.delete({
        where: {
            id
        }
    })

export const getReply = async (
    postId: string,
    replyId: string
): Promise<ReplyType | null> =>
    (await Prisma.reply.findUnique({
        where: {
            id: replyId,
            postId
        },
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
    })) as ReplyType | null

export const getReplies = async (postId: string):
    Promise<ReplyType[] | null> =>
    (
        await Prisma.reply.findMany({
            where: {
                postId
            },
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    ) as unknown as ReplyType[]

export const updateReply = async (
    replyId: string,
    postId: string,
    reply: UpdateReplyType
): Promise<ReplyType> =>
    (await Prisma.reply.update({
        where: {
            id: replyId,
            postId
        },
        data: {
            ...reply
        }
    })) as unknown as ReplyType

export const deleteReply = async (
    replyId: string,
    postId: string
) =>
    Prisma.reply.delete({
        where: {
            id: replyId,
            postId
        }
    })

export const getTags = async (
    search = '',
    limit?: number,
    page = 0
): Promise<TagType[]> => {
    const rows = await Prisma.tag.findMany({
        ...(limit !== undefined ? { take: limit } : {}),
        ...(limit !== undefined ? { skip: page * limit } : {}),
        ...(search ? { where: { name: { contains: search } } } : {}),
        select: { id: true, name: true, nameHe: true, slug: true }
    })
    return rows?.map(mapTag) ?? (null as unknown as TagType[])
}

export const getTag = async (id: string):
    Promise<TagType | null> => {
    const row = await Prisma.tag.findUnique({
        where: { id },
        include: {
            _count: { select: { posts: true, followers: true } }
        }
    })
    return row ? mapTag(row as RawTag) : null
}

export const getPopularTags = async (limit = 10):
    Promise<TagType[]> => {
    const rows = await Prisma.tag.findMany({
        orderBy: { posts: { _count: 'desc' } } as PrismaTypes.TagOrderByWithRelationInput,
        take: limit,
        select: { id: true, name: true, nameHe: true, slug: true }
    })
    return rows.map(mapTag)
}

export const getTagsByPostId = async (id: string):
    Promise<TagType[]> => {
    const rows = await Prisma.tag.findMany({
        where: { posts: { some: { id } } },
        select: { id: true, name: true, nameHe: true, slug: true }
    })
    return rows.map(mapTag)
}

export const getExistingTagsByName = async (
    names: string[]
): Promise<string[]> => {
    const tags = await Prisma.tag.findMany({
        where: { name: { in: names } },
        select: { name: true }
    })
    return tags.map((t) => t.name)
}

export const trackUnknownTagAttempts = async (
    tagNames: string[]
): Promise<void> => {
    await Promise.all(
        tagNames.map((tagName) =>
            Prisma.unknownTagAttempt.upsert({
                where: { tagName },
                update: { count: { increment: 1 } },
                create: { tagName, count: 1 }
            })
        )
    )
}

export const getUnknownTagAttempts = async () =>
    Prisma.unknownTagAttempt.findMany({
        orderBy: { count: 'desc' }
    })

export const getCategoryStats = async (): Promise<
    { category: string; count: number }[]
> => {
    const rows = await Prisma.post.groupBy({
        by: ['category'],
        _count: { category: true }
    })
    const mapped = rows.map((r) => ({
        category: r.category,
        count: r._count.category
    }))
    const total = mapped.reduce((sum, r) => sum + r.count, 0)
    return [{ category: 'all', count: total }, ...mapped]
}

export const createReply = async (reply: NewReplyType):
    Promise<ReplyType> => {
    const {
        authorId,
        postId,
        body
    } = reply

    return (await Prisma.reply.create({
        data: {
            body,
            author: {
                connect: {
                    id: authorId
                }
            },
            post: {
                connect: {
                    id: postId
                }
            }
        } as PrismaTypes.ReplyCreateInput
    })) as unknown as ReplyType
}
