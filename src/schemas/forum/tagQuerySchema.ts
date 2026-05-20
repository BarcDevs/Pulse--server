import { z } from 'zod'

import { paginationFields } from '../utils/fields'

export const tagQuerySchema = z.object({
    ...paginationFields,
    filter: z.literal('popular').optional(),
    search: z.string().optional()
})
