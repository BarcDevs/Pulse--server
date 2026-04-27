import { z } from 'zod'

export const tagQuerySchema = z.object({
    limit: z.number()
        .int()
        .max(100)
        .optional(),
    page: z.number()
        .int()
        .optional(),
    filter: z.literal('popular').optional(),
    search: z.string().optional()
})
