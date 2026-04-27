import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    ensurePostExists,
    extractRemovedTags,
    resolveTags,
    validateOwnerHelper
} from '../lib/forumHelpers'
import * as forumModel from '../models/forumModel'
import { getTagsByPostId } from '../models/forumModel'
import * as profileModel from '../models/profileModel'
import type {
    NewPostType,
    UpdatePostType
} from '../types/data/PostType'
import type {
    NewReplyType,
    UpdateReplyType
} from '../types/data/ReplyType'
import type { PostQuery, TagQuery } from '../types/query'

// region Validation
export const validateOwner = async (
    schema: 'post' | 'reply',
    postId: string,
    userId: string,
    replyId?: string
) => {
    await validateOwnerHelper(
        schema,
        postId,
        userId,
        replyId
    )
}
// endregion

// region Posts
export const getPosts = async (
    query?: PostQuery,
    id?: string
) => {
    if (id) return forumModel.getPost(id)
    return forumModel.getPosts(query)
}

export const getPostsCount = async (
    query?: PostQuery
) => forumModel.getPostsCount(query)

export const createPost = async (
    post: NewPostType
) => {
    const { authorId: userId } = post

    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic
            .notFound('User profile')
    }

    return forumModel.createPost({
        ...post,
        authorId: profile.id
    })
}

export const updatePost = async (
    id: string,
    post: UpdatePostType
) => {
    const prevTags = post.tags
        ? await getTagsByPostId(id)
        : undefined
    const removeTags = extractRemovedTags(
        prevTags,
        post.tags
    )

    return forumModel.updatePost(
        id,
        post,
        removeTags
    )
}

export const deletePost = async (
    id: string
) => forumModel.deletePost(id)
// endregion

// region Tags
export const getTags = async (
    options: TagQuery | {
        filter: 'id'
        id: string
    }
) => resolveTags(options)

export const getTag = async (
    id: string
) => forumModel.getTag(id)
// endregion

// region Replies
export const createReply = async (
    reply: NewReplyType
) => {
    const { authorId: userId } = reply

    await ensurePostExists(reply.postId)

    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic
            .notFound('User profile')
    }

    return forumModel.createReply({
        ...reply,
        authorId: profile.id
    })
}

export const getReplies = async (
    postId: string
) => {
    await ensurePostExists(postId)
    return forumModel.getReplies(postId)
}

export const updateReply = async (
    replyId: string,
    postId: string,
    reply: UpdateReplyType
) =>
    forumModel.updateReply(
        replyId,
        postId,
        reply
    )

export const deleteReply = async (
    replyId: string,
    postId: string
) => forumModel.deleteReply(replyId, postId)
// endregion