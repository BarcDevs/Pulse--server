import { z } from 'zod'

export const newPostSchema = z.object({
    title: z.string()
        .describe('Title is required'),
    body: z.string()
        .describe('Body is required'),
    category: z.string()
        .describe('Category is required'),
    tags: z.array(z.string())
        .describe('Tags are required')
})
