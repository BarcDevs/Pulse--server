import {
    Prisma as PrismaNamespace,
    type Prisma as PrismaTypes
} from '../../prisma/generated/prisma/client'
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

type RawTag = {
    id: string
    name: string
    nameHe: string
    slug: string
    description?: string | null
    createdAt?: Date
    _count?: {
        posts: number
        followers: number
    }
}

const mapTag = (raw: RawTag): TagType => ({
    id: raw.id,
    label: {
        en: raw.name,
        he: raw.nameHe
    },
    slug: raw.slug,
    ...(raw.description != null
        && { description: raw.description }),
    ...(raw.createdAt && { createdAt: raw.createdAt }),
    ...(raw._count && { _count: raw._count })
})

const mapPostTags = <T extends {tags?: RawTag[]}>(
    post: T
): T => ({
    ...post,
    tags: post.tags?.map(mapTag) ?? []
})

export const getPosts = async (
    query?: PostQuery
): Promise<PostType[]> => {
    const postQuery = postQueryBuilder(query)

    const posts = await Prisma.post.findMany({
        take: query?.limit || 10,
        skip:
            (query?.page ? query.page - 1 : 0)
            * (query?.limit || 10),
        ...postQuery
    })
    if (!posts) return null as unknown as PostType[]
    return posts.map(mapPostTags) as unknown as PostType[]
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

export const getPost = async (
    id: string,
    replies?: number
): Promise<PostType | null> => {
    const post = await Prisma.post.findUnique({
        where: {
            id,
            author: {
                user: {
                    active: true
                }
            }
        },
        include: postInclude('single', { replies })
    })
    return post
        ? mapPostTags(post) as unknown as PostType
        : null
}

export const createPost = async (post: NewPostType):
    Promise<PostType> => {
    const {
        authorId,
        tags,
        ...postData
    } = post

    const created = await Prisma.post.create({
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
    })
    return mapPostTags(created) as unknown as PostType
}

export const updatePost = async (
    id: string,
    post: UpdatePostType
): Promise<PostType> => {
    const { tags } = post

    const data: PrismaTypes.PostUpdateInput = {
        ...(post.title !== undefined
            && { title: post.title }),
        ...(post.body !== undefined
            && { body: post.body }),
        ...(post.category !== undefined
            && { category: post.category })
    }

    if (tags !== undefined) {
        data.tags = {
            set: tags.map((id) => ({ id }))
        }
    }

    const updated = await Prisma.post.update({
        where: {
            id
        },
        data,
        include: postInclude('single')
    })
    return mapPostTags(updated) as unknown as PostType
}

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

export const getReplies = async (
    postId: string,
    limit?: number,
    page?: number
): Promise<ReplyType[]> =>
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
                },
                _count: {
                    select: { likes: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            ...(limit !== undefined && { take: limit }),
            ...(limit !== undefined && page !== undefined && {
                skip: (page - 1) * limit
            })
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
        ...(limit !== undefined
            ? { take: limit }
            : {}),
        ...(limit !== undefined
            ? { skip: page * limit }
            : {}),
        ...(search
            ? { where: { name: { contains: search } } }
            : {}),
        select: {
            id: true,
            name: true,
            nameHe: true,
            slug: true
        }
    })
    return rows?.map(mapTag)
        ?? (null as unknown as TagType[])
}

export const getTag = async (id: string):
    Promise<TagType | null> => {
    const row = await Prisma.tag.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    posts: true,
                    followers: true
                }
            }
        }
    })
    return row ? mapTag(row as RawTag) : null
}

export const getPopularTags = async (limit = 10):
    Promise<TagType[]> => {
    const orderByClause: PrismaTypes.TagOrderByWithRelationInput =
        { posts: { _count: 'desc' } }
    const rows = await Prisma.tag.findMany({
        orderBy: orderByClause,
        take: limit,
        select: {
            id: true,
            name: true,
            nameHe: true,
            slug: true
        }
    })
    return rows.map(mapTag)
}

export const getTagsByPostId = async (id: string):
    Promise<TagType[]> => {
    const rows = await Prisma.tag.findMany({
        where: { posts: { some: { id } } },
        select: {
            id: true,
            name: true,
            nameHe: true,
            slug: true
        }
    })
    return rows.map(mapTag)
}

export const getExistingTagsByName = async (
    names: string[]
): Promise<string[]> => {
    const tags = await Prisma.tag.findMany({
        where: {
            OR: [
                { slug: { in: names } },
                { name: { in: names } }
            ]
        },
        select: { name: true }
    })
    return tags.map((t) => t.name)
}

export const getTagIdsByNames = async (
    names: string[]
): Promise<string[]> => {
    const tags = await Prisma.tag.findMany({
        where: {
            OR: [
                { name: { in: names } },
                { slug: { in: names } }
            ]
        },
        select: { id: true }
    })
    return tags.map((t) => t.id)
}

export const trackUnknownTagAttempts = async (
    tagNames: string[]
): Promise<void> => {
    await Promise.all(
        tagNames.map((tagName) =>
            Prisma.unknownTagAttempt.upsert({
                where: { tagName },
                update: {
                    count: { increment: 1 }
                },
                create: {
                    tagName,
                    count: 1
                }
            })
        )
    )
}

export const getUnknownTagAttempts = async () =>
    Prisma.unknownTagAttempt.findMany({
        orderBy: { count: 'desc' }
    })

export const getCategoryStats = async (): Promise<{
    category: string
    count: number
}[]> => {
    const rows = await Prisma.post.groupBy({
        by: ['category'],
        _count: { category: true }
    })
    const mapped = rows.map((r) => ({
        category: r.category,
        count: r._count.category
    }))
    const total = mapped.reduce(
        (sum, r) => sum + r.count,
        0
    )
    return [
        {
            category: 'all',
            count: total
        },
        ...mapped
    ]
}

export const togglePostLike = async (
    profileId: string,
    postId: string
): Promise<{liked: boolean; likes: number}> => {
    const deleted = await Prisma.postLike.deleteMany({
        where: { profileId, postId }
    })

    let liked: boolean
    if (deleted.count === 0) {
        try {
            await Prisma.postLike.create({
                data: { profileId, postId }
            })
            liked = true
        } catch (e) {
            if (
                e instanceof PrismaNamespace
                    .PrismaClientKnownRequestError
                && e.code === 'P2002'
            ) {
                liked = true
            } else {
                throw e
            }
        }
    } else {
        liked = false
    }

    const likes = await Prisma.postLike.count({
        where: { postId }
    })
    return { liked, likes }
}

export const toggleReplyLike = async (
    profileId: string,
    replyId: string
): Promise<{liked: boolean; likes: number}> => {
    const deleted = await Prisma.replyLike.deleteMany({
        where: { profileId, replyId }
    })

    let liked: boolean
    if (deleted.count === 0) {
        try {
            await Prisma.replyLike.create({
                data: { profileId, replyId }
            })
            liked = true
        } catch (e) {
            if (
                e instanceof PrismaNamespace
                    .PrismaClientKnownRequestError
                && e.code === 'P2002'
            ) {
                liked = true
            } else {
                throw e
            }
        }
    } else {
        liked = false
    }

    const likes = await Prisma.replyLike.count({
        where: { replyId }
    })
    return { liked, likes }
}

export const toggleSavePost = async (
    profileId: string,
    postId: string
): Promise<{saved: boolean}> => {
    const deleted = await Prisma.savedPost.deleteMany({
        where: { profileId, postId }
    })

    if (deleted.count === 0) {
        try {
            await Prisma.savedPost.create({
                data: { profileId, postId }
            })
            return { saved: true }
        } catch (e) {
            if (
                e instanceof PrismaNamespace
                    .PrismaClientKnownRequestError
                && e.code === 'P2002'
            ) {
                return { saved: true }
            }
            throw e
        }
    }

    return { saved: false }
}

export const getSavedPosts = async (
    profileId: string,
    query?: PostQuery
): Promise<PostType[]> => {
    const postQuery = postQueryBuilder(query, {
        where: {
            savedBy: { some: { profileId } }
        }
    })

    const posts = await Prisma.post.findMany({
        take: query?.limit || 10,
        skip:
            (query?.page ? query.page - 1 : 0)
            * (query?.limit || 10),
        ...postQuery
    })

    if (!posts) return null as unknown as PostType[]
    return posts.map(mapPostTags) as unknown as PostType[]
}

export const getProfileInteractions = async (
    profileId: string,
    includePosts: boolean
) => {
    if (includePosts) {
        const [
            likedPostRows,
            likedReplyRows,
            savedPostRows
        ] = await Promise.all([
            Prisma.postLike.findMany({
                where: { profileId },
                orderBy: { likedAt: 'desc' },
                include: {
                    post: {
                        include: postInclude('multiple')
                    }
                }
            }),
            Prisma.replyLike.findMany({
                where: { profileId },
                orderBy: { likedAt: 'desc' },
                include: {
                    reply: {
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
                }
            }),
            Prisma.savedPost.findMany({
                where: { profileId },
                orderBy: { savedAt: 'desc' },
                include: {
                    post: {
                        include: postInclude('multiple')
                    }
                }
            })
        ])

        return {
            likedPosts: likedPostRows.map(
                (r) => mapPostTags(r.post)
            ),
            likedReplies: likedReplyRows.map(
                (r) => r.reply
            ),
            savedPosts: savedPostRows.map(
                (r) => mapPostTags(r.post)
            )
        }
    }

    const [
        likedPostRows,
        likedReplyRows,
        savedPostRows
    ] =
        await Promise.all([
            Prisma.postLike.findMany({
                where: { profileId },
                orderBy: { likedAt: 'desc' },
                select: { postId: true }
            }),
            Prisma.replyLike.findMany({
                where: { profileId },
                orderBy: { likedAt: 'desc' },
                select: { replyId: true }
            }),
            Prisma.savedPost.findMany({
                where: { profileId },
                orderBy: { savedAt: 'desc' },
                select: { postId: true }
            })
        ])

    return {
        likedPostIds: likedPostRows.map(
            (r) => r.postId
        ),
        likedReplyIds: likedReplyRows.map(
            (r) => r.replyId
        ),
        savedPostIds: savedPostRows.map(
            (r) => r.postId
        )
    }
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
