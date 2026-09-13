import { z } from 'zod'

import { POST_LIMITS } from '../../constants/forum/postLimits'
import { tagsField } from '../utils/fields'

export const newPostSchema = z.object({
    title: z.string('Title is required').max(POST_LIMITS.MAX_TITLE_LENGTH),
    body: z.string('Body is required').max(POST_LIMITS.MAX_BODY_LENGTH),
    category: z.string('Category is required'),
    tags: tagsField
})

export type NewPostType = z.infer<typeof newPostSchema>
