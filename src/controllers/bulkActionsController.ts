import type { Request, Response } from 'express'

import { errorFactory } from '../errors/factory'
import { successResponse } from '../responses/success'
import * as forumService from '../services/forumService'
import type { NewPostType, PostType } from '../types/data/PostType'
import type { NewReplyType, ReplyType } from '../types/data/ReplyType'

export const bulkCreatePosts = async (
    req: Request,
    res: Response
) => {
    const posts = req.body as Array<NewPostType>

    if (!Array.isArray(posts) || posts.length === 0)
        throw errorFactory.validation.generic('Invalid or empty post array')

    const createdPosts = await Promise.all(
        posts.map(
            async (post) => {
                if (!post.authorId)
                    throw errorFactory.auth.unauthorized('Post is missing authorId')

                return forumService.createPost({
                    ...post
                })
            })
    )
    return successResponse<PostType[]>(
        res,
        createdPosts,
        'Posts created successfully'
    )
}

export const bulkCreateReplies = async (
    req: Request,
    res: Response
) => {
    const replies = req.body as Array<NewReplyType>

    if (!Array.isArray(replies) || replies.length === 0)
        throw errorFactory.validation.generic('Invalid or empty replies array')

    const createdReplies = await Promise.all(
        replies.map(
            async (reply) => {
                if (!reply.authorId || !reply.postId)
                    throw errorFactory.auth.unauthorized(
                        'Reply is missing authorId or postId'
                    )

                return forumService.createReply({
                    ...reply
                })
            })
    )

    return successResponse<ReplyType[]>(
        res,
        createdReplies,
        'Replies created successfully'
    )
}
