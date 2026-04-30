import { z } from 'zod'

export const newPostSchema = z.object({
    title: z.string('Title is required'),
    body: z.string('Body is required'),
    category: z.string('Category is required'),
    tags: z.array(z.string('Tags are required')).min(1, 'Tags are required')
})
