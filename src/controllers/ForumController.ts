import type {Request, Response} from 'express'

import {errorFactory} from '../errors/factory'
import {ValidationError} from '../errors/ValidationError'
import {successResponse} from '../responses/success'
import {newPostSchema} from '../schemas/forum/newPostSchema'
import {newReplySchema} from '../schemas/forum/newReplySchema'
import {postQuerySchema} from '../schemas/forum/postQuerySchema'
import {tagQuerySchema} from '../schemas/forum/tagQuerySchema'
import {updatePostSchema} from '../schemas/forum/updatePostSchema'
import {updateReplySchema} from '../schemas/forum/updateReplySchema'
import * as forumService from '../services/forumService'
import type {PostType} from '../types/data/PostType'
import type {ReplyType} from '../types/data/ReplyType'
import type {TagType} from '../types/data/TagType'

// region Posts
export const getPosts = async (
    req: Request,
    res: Response
) => {
    const validatedQuery =
        req.query &&
        ValidationError.catchValidationErrors(
            postQuerySchema.validate(req.query)
        )

    const data = (
        await forumService.getPosts(validatedQuery)
    ) as
        | PostType[]
        | null

    if (!data)
        throw errorFactory.generic.notFound('Posts')

    return successResponse<PostType[]>(
        res,
        data,
        `${data.length} posts found`
    )
}

export const createPost = async (
    req: Request,
    res: Response
) => {
    const validatedData =
        ValidationError.catchValidationErrors(
            newPostSchema.validate(req.body)
        )
    const {userId} = req || {}

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const data = await forumService.createPost({
        ...validatedData,
        authorId: userId
    })
    return successResponse<PostType>(
        res,
        data,
        'Post created successfully'
    )
}

export const getPost = async (
    req: Request,
    res: Response
) => {
    const {postId} = req.params

    const data = (await forumService
        .getPosts(undefined, postId)) as PostType

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
    const validatedData =
        ValidationError.catchValidationErrors(
            updatePostSchema.validate(req.body)
        )
    const {postId} = req.params
    const {userId} = req || {}

    if (!userId)
        throw errorFactory.auth.unauthorized()

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
    const {postId} = req.params
    const {userId} = req || {}

    if (!userId)
        throw errorFactory.auth.unauthorized()

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
// endregion

// region Replies
export const createReply = async (
    req: Request,
    res: Response
) => {
    const validatedData =
        ValidationError.catchValidationErrors(
            newReplySchema.validate(req.body)
        )
    const {userId} = req || {}
    const {postId} = req.params

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
        'Reply created successfully'
    )
}

export const getReplies = async (
    req: Request,
    res: Response
) => {
    const {postId} = req.params

    const data = (
        await forumService.getReplies(postId)
    ) as ReplyType[]

    if (!data)
        throw errorFactory
            .generic.notFound('Replies')

    return successResponse<ReplyType[]>(
        res,
        data,
        `${data.length} Replies for post ${postId} found`
    )
}

export const updateReply = async (
    req: Request,
    res: Response
) => {
    const validatedData =
        ValidationError.catchValidationErrors(
            updateReplySchema.validate(req.body)
        )
    const {replyId, postId} = req.params
    const {userId} = req || {}

    if (!userId)
        throw errorFactory.auth.unauthorized()

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
    const {replyId, postId} = req.params
    const {userId} = req || {}

    if (!userId)
        throw errorFactory.auth.unauthorized()

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

// region Tags
export const getTags = async (
    req: Request,
    res: Response
) => {
    const validatedQuery =
        req.query &&
        ValidationError.catchValidationErrors(
            tagQuerySchema.validate(req.query)
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
    const {tagId} = req.params

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
// endregion
