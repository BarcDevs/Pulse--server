import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    ensurePostExists,
    resolveTags,
    validateOwnerHelper
} from '../lib/forumHelpers'
import * as forumModel from '../models/forumModel'
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
    const profile = await profileModel.getProfileByUserId(userId)
    if (!profile)
        throw errorFactory.generic.notFound('User profile')

    await validateOwnerHelper(
        schema,
        postId,
        profile.id,
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

export const getPost = async (
    id: string,
    replies?: number
) => forumModel.getPost(id, replies)

export const getPostsCount = async (
    query?: PostQuery
) => forumModel.getPostsCount(query)

const resolveKnownTags = async (
    tags: string[] | undefined
): Promise<string[] | undefined> => {
    if (!tags || tags.length === 0) return tags

    const known = await forumModel
        .getExistingTagsByName(tags)
    const unknown = tags.filter(
        (t) => !known.includes(t)
    )

    if (unknown.length > 0) {
        await forumModel.trackUnknownTagAttempts(unknown)
    }

    return known
}

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

    const knownTags = await resolveKnownTags(post.tags)

    return forumModel.createPost({
        ...post,
        tags: knownTags,
        authorId: profile.id
    })
}

export const updatePost = async (
    id: string,
    post: UpdatePostType
) => {
    const knownTags = await resolveKnownTags(post.tags)
    const tagIds = knownTags
        ? await forumModel.getTagIdsByNames(knownTags)
        : undefined

    return forumModel.updatePost(
        id,
        {
            ...post,
            tags: tagIds as unknown as string[]
        }
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

export const reportUnknownTag = async (
    tagName: string
) => forumModel.trackUnknownTagAttempts([tagName])

export const getUnknownTagAttempts = async () =>
    forumModel.getUnknownTagAttempts()

export const getCategoryStats = async () =>
    forumModel.getCategoryStats()
// endregion

// region Likes & Saves
export const togglePostLike = async (
    postId: string,
    userId: string
) => {
    await ensurePostExists(postId)

    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile)
        throw errorFactory.generic.notFound('User profile')

    return forumModel.togglePostLike(profile.id, postId)
}

export const toggleReplyLike = async (
    postId: string,
    replyId: string,
    userId: string
) => {
    const reply = await forumModel.getReply(postId, replyId)

    if (!reply)
        throw errorFactory.generic.notFound('Reply')

    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile)
        throw errorFactory.generic.notFound('User profile')

    return forumModel.toggleReplyLike(profile.id, replyId)
}

export const toggleSavePost = async (
    postId: string,
    userId: string
) => {
    await ensurePostExists(postId)

    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile)
        throw errorFactory.generic.notFound('User profile')

    return forumModel.toggleSavePost(profile.id, postId)
}

export const getSavedPosts = async (
    userId: string,
    query?: PostQuery
) => {
    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile)
        throw errorFactory.generic.notFound('User profile')

    return forumModel.getSavedPosts(profile.id, query)
}
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
    postId: string,
    limit?: number,
    page?: number
) => {
    await ensurePostExists(postId)
    return forumModel.getReplies(
        postId,
        limit,
        page
    )
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