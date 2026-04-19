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
    const { authorId, tags, ...postData } = post

    return (await Prisma.post.create({
        data: {
            ...postData,
            author: {
                connect: {
                    id: authorId
                }
            },
            tags: {
                ...connectTags(tags)
            }
        } as PrismaTypes.PostCreateInput,
        include: postInclude('single')
    })) as unknown as PostType
}

export const updatePost = async (
    id: string,
    post: UpdatePostType,
    removeTags?: TagType[]
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
    limit = 10,
    page = 0
): Promise<TagType[]> =>
    (await Prisma.tag.findMany({
        take: limit,
        skip: page * limit,
        ...(search ? {
            where: {
                name: { contains: search }
            }
        } : {}),
        select: {
            id: true,
            name: true,
            slug: true
        }
    })) as TagType[]

export const getTag = async (id: string):
    Promise<TagType | null> =>
    (await Prisma.tag.findUnique({
        where: {
            id
        },
        include: {
            _count: {
                select: {
                    posts: true,
                    followers: true
                }
            }
        }
    })) as TagType | null

export const getPopularTags = async (limit = 10):
    Promise<TagType[]> =>
    (await Prisma.tag.findMany({
        orderBy: {
            posts: {
                _count: 'desc'
            }
        } as PrismaTypes.TagOrderByWithRelationInput,
        take: limit
    })) as TagType[]

export const getTagsByPostId = async (id: string):
    Promise<TagType[]> =>
    (await Prisma.tag.findMany({
        where: {
            posts: {
                some: {
                    id
                }
            }
        }
    })) as unknown as TagType[]

export const createReply = async (reply: NewReplyType):
    Promise<ReplyType> => {
    const { authorId, postId, body } = reply

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
