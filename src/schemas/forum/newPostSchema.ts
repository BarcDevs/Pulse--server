import { z } from 'zod'

export const newPostSchema = z.object({
    title: z.string(),
    body: z.string(),
    category: z.string(),
    tags: z.array(z.string())
})
