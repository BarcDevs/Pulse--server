import joi from 'joi'

import type { NewPostType } from '../../types/data/PostType'

export const newPostSchema = joi.object<Omit<NewPostType, 'authorId'>>({
    title: joi.string().required(),
    body: joi.string().required(),
    category: joi.string().required(),
    tags: joi.array().items(joi.string()).required(),
})
