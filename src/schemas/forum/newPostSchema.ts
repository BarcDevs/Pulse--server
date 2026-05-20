import { z } from 'zod'

import { tagsField } from '../utils/fields'

export const newPostSchema = z.object({
    title: z.string('Title is required'),
    body: z.string('Body is required'),
    category: z.string('Category is required'),
    tags: tagsField
})
