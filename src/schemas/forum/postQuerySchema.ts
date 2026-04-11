import joi from 'joi'

import type { PostQuery } from '../../types/query'

export const postQuerySchema = joi.object<PostQuery>({
    limit: joi.number().integer().max(100),
    page: joi.number().integer(),
    filter: joi
        .string()
        .valid(
            'newest',
            'popular',
            'hot',
            'unanswered'
        ),
    search: joi.string(),
    tag: joi.string(),
    category: joi.string()
})
