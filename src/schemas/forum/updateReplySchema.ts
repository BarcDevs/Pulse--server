import { z } from 'zod'

export const updateReplySchema = z.object({
    body: z.string().optional()
})
