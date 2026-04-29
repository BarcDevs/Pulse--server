import { z } from 'zod'

export const newReplySchema = z.object({
    body: z.string('Body is required')
        .min(1)
})
