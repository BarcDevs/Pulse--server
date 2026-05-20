import { z } from 'zod'

import { tagsField, voteField } from '../utils/fields'

export const updatePostSchema = z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    category: z.string().optional(),
    tags: tagsField,
    vote: voteField
})
