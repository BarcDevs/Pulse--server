import { z } from 'zod'

import { PostFilter } from '../../types/query'
import { paginationFields } from '../utils/fields'

export const postQuerySchema = z.object({
    ...paginationFields,
    filter: z.enum(PostFilter).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
    category: z.string().optional()
})
