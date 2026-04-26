import { z } from 'zod'

export const updatePostSchema = z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    vote: z.object({
        userId: z.string(),
        vote: z.literal('up')
    }).optional()
})
