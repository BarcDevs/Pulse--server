import { z } from 'zod'

export const newReplySchema = z.object({
    body: z.string()
        .min(1)
        .describe('Body is required')
})
