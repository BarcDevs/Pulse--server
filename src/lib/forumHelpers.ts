import { errorFactory } from '../errors/factory'
import * as forumModel from '../models/ForumModel'
import type { TagQuery } from '../types/query'
import { capitalizeText } from '../utils/capitalizeText'

export const ensurePostExists = async (postId: string) => {
    const post = await forumModel.getPost(postId)
    if (!post) {
        throw errorFactory.generic.notFound('Post')
    }
    return post
}

export const extractRemovedTags = (
    prevTags: Array<{ name: string }> | undefined,
    newTagNames: string[] | undefined
) => {
    if (!prevTags || !newTagNames)
        return undefined

    return prevTags.filter(
        (tag) => !newTagNames.includes(tag.name)
    )
}

export const resolveTags = async (
    options: TagQuery | {filter: 'id'; id: string}
) => {
    if (options.filter === 'id') {
        return forumModel.getTagsByPostId(
            options.id
        )
    }

    if (options.filter === 'popular') {
        return forumModel.getPopularTags(
            options.limit
        )
    }

    return forumModel.getTags(
        options.search,
        options.limit,
        options.page
    )
}

export const validateOwnerHelper = async (
    schema: 'post' | 'reply',
    postId: string,
    userId: string,
    replyId?: string
) => {
    if (schema === 'reply' && !replyId)
        throw errorFactory.validation.generic(
            'replyId is missing',
            'replyId'
        )

    const data =
        schema === 'post'
            ? await forumModel.getPost(postId)
            : await forumModel.getReply(
                postId,
                replyId!
            )

    if (!data)
        throw errorFactory.generic.notFound(
            capitalizeText(schema)
        )

    if (data.authorId !== userId)
        throw errorFactory.auth.unauthorized(
            `you are not the author of this ${schema}!`
        )
}