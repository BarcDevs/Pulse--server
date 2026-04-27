import { z } from 'zod'

export const checkInQuerySchema = z.object({
    limit: z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .optional()
})