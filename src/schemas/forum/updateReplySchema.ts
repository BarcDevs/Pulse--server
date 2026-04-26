import { z } from 'zod'

export const updateReplySchema = z.object({
    body: z.string().optional(),
    vote: z.object({
        userId: z.string(),
        vote: z.literal('up')
    }).optional()
})
