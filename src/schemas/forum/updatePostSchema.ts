import { z } from 'zod'

import { tagsField } from '../utils/fields'

export const updatePostSchema = z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    category: z.string().optional(),
    tags: tagsField
})
