import { z } from 'zod'

export const newReplySchema = z.object({
    body: z.string()
})
