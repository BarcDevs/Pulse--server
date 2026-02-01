import joi from 'joi'

import type { UpdatePostType } from '../../types/data/PostType'

export const updatePostSchema = joi.object<Omit<UpdatePostType, 'removeTags'>>({
    title: joi.string(),
    body: joi.string(),
    category: joi.string(),
    tags: joi.array().items(joi.string()),
    vote: joi.object({
        userId: joi.string().required(),
        vote: joi.valid('up', 'down').required(),
    }),
})
