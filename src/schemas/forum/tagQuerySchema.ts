import joi from 'joi'

import type { TagQuery } from '../../types/query'

export const tagQuerySchema = joi.object<TagQuery>({
    limit: joi.number().integer().max(100),
    page: joi.number().integer(),
    filter: joi.string().valid('popular'),
    search: joi.string()
})
