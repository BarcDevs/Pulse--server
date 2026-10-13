import type { Request, Response } from 'express'

import { FORUM_PAGINATION } from '../constants/forum/pagination'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { successResponse } from '../responses/success'
import type { NewPostType } from '../schemas/forum/newPostSchema'
import { newPostSchema } from '../schemas/forum/newPostSchema'
import type { NewReplyType } from '../schemas/forum/newReplySchema'
import { newReplySchema } from '../schemas/forum/newReplySchema'
import type { PostQueryType } from '../schemas/forum/postQuerySchema'
import { postQuerySchema } from '../schemas/forum/postQuerySchema'
import type { ReplyQueryType } from '../schemas/forum/replyQuerySchema'
import { replyQuerySchema } from '../schemas/forum/replyQuerySchema'
import type { TagQueryType } from '../schemas/forum/tagQuerySchema'
import { tagQuerySchema } from '../schemas/forum/tagQuerySchema'
import type { UnknownTagType } from '../schemas/forum/unknownTagSchema'
import { unknownTagSchema } from '../schemas/forum/unknownTagSchema'
import type { UpdatePostType } from '../schemas/forum/updatePostSchema'
import { updatePostSchema } from '../schemas/forum/updatePostSchema'
import type { UpdateReplyType } from '../schemas/forum/updateReplySchema'
import { updateReplySchema } from '../schemas/forum/updateReplySchema'
import * as forumService from '../services/forumService'
import type { PostType } from '../types/data/PostType'
import type { ReplyType } from '../types/data/ReplyType'
import type { TagType } from '../types/data/TagType'
import type { PaginatedType } from '../types/PaginatedType'
import {
    extractUserId,
    validateAndExtract
} from '../utils/controllerHelpers'

// region Posts
export const getPosts = async (
    req: Request,
    res: Response
) => {
    const validatedQuery =
        req.query
        && validateAndExtract<PostQueryType>(
            postQuerySchema,
            req.query
        )

    const data = (
        await forumService.getPosts(validatedQuery)
    ) as PostType[] | null

    if (!data)
        throw errorFactory.generic.notFound('Posts')

    const { count } = await forumService.getPostsCount(validatedQuery)
    const page = validatedQuery?.page ?? 1
    const limit = validatedQuery?.limit ?? 10

    return successResponse<PaginatedType<PostType>>(
        res,
        {
            items: data,
            pagination: {
                total: count,
                page,
                limit,
                hasMore: page * limit < count
            }
        },
        `${data.length} posts found`
    )
}

export const createPost = async (
    req: Request,
    res: Response
) => {
    const validatedData = validateAndExtract<NewPostType>(
        newPostSchema,
        req.body
    )
    const userId = extractUserId(req)

    const data = await forumService.createPost({
        ...validatedData,
        authorId: userId
    })
    return successResponse<PostType>(
        res,
        data,
        'Post created successfully',
        HttpStatusCodes.CREATED
    )
}

export const getPost = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }
    const { limit } = validateAndExtract<ReplyQueryType>(
        replyQuerySchema,
        req.query
    )

    const resolvedLimit = limit ?? FORUM_PAGINATION.DEFAULT_REPLY_LIMIT

    const data = (await forumService
        .getPost(postId, resolvedLimit)) as PostType

    if (!data)
        throw errorFactory.generic.notFound('Post')

    return successResponse<PostType>(
        res,
        data,
        `Post ${postId} found`
    )
}

export const updatePost = async (
    req: Request,
    res: Response
) => {
    const validatedData = validateAndExtract<UpdatePostType>(
        updatePostSchema,
        req.body
    )
    const { postId } = req.params as { postId: string }
    const userId = extractUserId(req)

    await forumService.validateOwner(
        'post',
        postId,
        userId
    )

    const data = await forumService
        .updatePost(postId, validatedData)

    return successResponse<PostType>(
        res,
        data,
        `Post ${postId} updated`
    )
}

export const deletePost = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }
    const userId = extractUserId(req)

    await forumService.validateOwner(
        'post',
        postId,
        userId
    )

    await forumService.deletePost(postId)

    return successResponse(
        res,
        {},
        `Post ${postId} deleted!`
    )
}

export const sharePost = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }

    const data = await forumService.sharePost(postId)

    return successResponse(
        res,
        data,
        `Post ${postId} shared`
    )
}

export const recordPostView = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }
    const userId = extractUserId(req)

    await forumService.recordPostView(postId, userId)

    return successResponse(
        res,
        null,
        `View of post ${postId} recorded`
    )
}
// endregion

// region Replies
export const createReply = async (
    req: Request,
    res: Response
) => {
    const validatedData = validateAndExtract<NewReplyType>(
        newReplySchema,
        req.body
    )
    const { userId } = req || {}
    const { postId } = req.params as { postId: string }

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const data = await forumService.createReply({
        ...validatedData,
        postId,
        authorId: userId
    })

    return successResponse<ReplyType>(
        res,
        data,
        'Reply created successfully',
        HttpStatusCodes.CREATED
    )
}

export const getReplies = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as {
        postId: string
    }
    const { limit, page } = validateAndExtract<ReplyQueryType>(
        replyQuerySchema,
        req.query
    )

    const resolvedLimit = limit ?? FORUM_PAGINATION.DEFAULT_REPLY_LIMIT
    const resolvedPage = page ?? 1

    const data = (
        await forumService.getReplies(
            postId,
            resolvedLimit,
            resolvedPage)

    ) as ReplyType[]

    const { count } = await forumService.getRepliesCount(postId)

    return successResponse<PaginatedType<ReplyType>>(
        res,
        {
            items: data,
            pagination: {
                total: count,
                page: resolvedPage,
                limit: resolvedLimit,
                hasMore: resolvedPage * resolvedLimit < count
            }
        },
        `found ${data.length} replies for post ${postId}`
    )
}

export const updateReply = async (
    req: Request,
    res: Response
) => {
    const validatedData = validateAndExtract<UpdateReplyType>(
        updateReplySchema,
        req.body
    )
    const { replyId, postId } = req.params as {
        replyId: string
        postId: string
    }
    const userId = extractUserId(req)

    await forumService.validateOwner(
        'reply',
        postId,
        userId,
        replyId
    )

    const data = await forumService.updateReply(
        replyId,
        postId,
        validatedData
    )

    return successResponse<ReplyType>(
        res,
        data,
        `Reply ${replyId} updated`
    )
}

export const deleteReply = async (
    req: Request,
    res: Response
) => {
    const { replyId, postId } = req.params as {
        replyId: string
        postId: string
    }
    const userId = extractUserId(req)

    await forumService.validateOwner(
        'reply',
        postId,
        userId,
        replyId
    )

    await forumService.deleteReply(replyId, postId)

    return successResponse(
        res,
        {},
        `Reply ${replyId} deleted`
    )
}
// endregion

// region Likes & Saves
export const likePost = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }
    const userId = extractUserId(req)

    const data = await forumService
        .togglePostLike(postId, userId)

    return successResponse(
        res,
        data,
        data.liked ? 'Post liked' : 'Post unliked'
    )
}

export const likeReply = async (
    req: Request,
    res: Response
) => {
    const { postId, replyId } = req.params as {
        postId: string
        replyId: string
    }
    const userId = extractUserId(req)

    const data = await forumService.toggleReplyLike(
        postId,
        replyId,
        userId
    )

    return successResponse(
        res,
        data,
        data.liked ? 'Reply liked' : 'Reply unliked'
    )
}

export const savePost = async (
    req: Request,
    res: Response
) => {
    const { postId } = req.params as { postId: string }
    const userId = extractUserId(req)

    const data = await forumService
        .toggleSavePost(postId, userId)

    return successResponse(
        res,
        data,
        data.saved ? 'Post saved' : 'Post unsaved'
    )
}

export const getSavedPosts = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const validatedQuery =
        req.query
        && validateAndExtract<PostQueryType>(
            postQuerySchema,
            req.query
        )

    const data = await forumService
        .getSavedPosts(userId, validatedQuery)

    return successResponse(
        res,
        data ?? [],
        `${data?.length ?? 0} saved posts found`
    )
}
// endregion

// region Tags
export const getTags = async (
    req: Request,
    res: Response
) => {
    const validatedQuery =
        req.query
        && validateAndExtract<TagQueryType>(
            tagQuerySchema,
            req.query
        )

    const data = await forumService
        .getTags(validatedQuery)

    if (!data)
        throw errorFactory.generic.notFound('Tags')

    return successResponse<TagType[]>(
        res,
        data,
        `${data.length} tags found`
    )
}

export const getTag = async (
    req: Request,
    res: Response
) => {
    const { tagId } = req.params as { tagId: string }

    const data = await forumService.getTag(tagId)

    if (!data)
        throw errorFactory
            .generic.notFound(`Tag ${tagId}`)

    return successResponse<TagType>(
        res,
        data,
        `Tag ${tagId} found`
    )
}

export const reportUnknownTag = async (
    req: Request,
    res: Response
) => {
    const { tagName } = validateAndExtract<UnknownTagType>(
        unknownTagSchema,
        req.body
    )

    await forumService.reportUnknownTag(tagName)

    return successResponse(
        res,
        {},
        'Tag attempt recorded'
    )
}

export const getUnknownTagAttempts = async (
    req: Request,
    res: Response
) => {
    const data = await forumService
        .getUnknownTagAttempts()

    return successResponse(
        res,
        data,
        `${data.length} unknown tag attempts`
    )
}

export const getCategoryStats = async (
    req: Request,
    res: Response
) => {
    const data = await forumService.getCategoryStats()

    return successResponse(
        res,
        data,
        `${data.length} categories found`
    )
}
// endregion
