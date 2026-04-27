import { z } from 'zod'

import { PostFilter } from '../../types/query'

export const postQuerySchema = z.object({
    limit: z.number()
        .int()
        .max(100)
        .optional(),
    page: z.number()
        .int()
        .optional(),
    filter: z.enum(PostFilter).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
    category: z.string().optional()
})
