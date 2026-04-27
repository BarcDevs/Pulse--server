import { z } from 'zod'

export const newReplySchema = z.object({
    body: z.string()
        .describe('Body is required')
})
