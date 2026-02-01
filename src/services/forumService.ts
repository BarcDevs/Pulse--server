import { ErrorFactory, errorFactory } from '../errors/factory'
import { getTagsByPostId } from '../models/ForumModel'
import * as forumModel from '../models/ForumModel'
import type { NewPostType, UpdatePostType } from '../types/data/PostType'
import type { NewReplyType, UpdateReplyType } from '../types/data/ReplyType'
import type { PostQuery, TagQuery } from '../types/query'
import { capitalizeText } from '../utils/capitalizeText'

// region Validation
export const validateOwner = async (
    schema: 'post' | 'reply',
    postId: string,
    userId: string,
    replyId?: string
) => {
    if (schema === 'reply' && !replyId)
        throw ErrorFactory.GenericError('replyId is missing')

    const data =
        schema === 'post'
            ? await forumModel.getPost(postId)
            : await forumModel.getReply(postId, replyId!)

    if (!data)
        throw errorFactory.generic.notFound(capitalizeText(schema))

    if (data.authorId !== userId)
        throw errorFactory.auth.unauthorized(
            `you are not the author of this ${schema}!`
        )
}
// endregion

// region Posts
export const getPosts = async (
    query?: PostQuery,
    id?: string
) => {
    if (id)
        return forumModel.getPost(id)

    return forumModel.getPosts(query)
}

export const getPostsCount = async (
    query?: PostQuery
) =>
    forumModel.getPostsCount(query)

export const createPost = async (
    post: NewPostType
) =>
    forumModel.createPost(post)

export const updatePost = async (
    id: string,
    post: UpdatePostType
) => {
    const prevTags = post.tags ?
        await getTagsByPostId(id) :
        undefined
    const removeTags =
        prevTags?.filter(
            (tag) => !post.tags?.includes(tag.name)
        )

    return forumModel.updatePost(id, post, removeTags)
}

export const deletePost = async (
    id: string
) =>
    forumModel.deletePost(id)
// endregion

// region Tags
export const getTags = async (
    options: TagQuery | { filter: 'id'; id: string }
) =>
    options.filter === 'id'
        ? forumModel.getTagsByPostId(options.id)
        : options.filter === 'popular'
            ? forumModel.getPopularTags(options.limit)
            : forumModel.getTags(
                options.search,
                options.limit,
                options.page
            )

export const getTag = async (
    id: string
) =>
    forumModel.getTag(id)

export const createReply = async (
    reply: NewReplyType
) =>
    forumModel.createReply(reply)
// endregion

// region Replies
export const getReplies = async (
    postId: string
) =>
    forumModel.getReplies(postId)

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
) =>
    forumModel.deleteReply(replyId, postId)
// endregion
