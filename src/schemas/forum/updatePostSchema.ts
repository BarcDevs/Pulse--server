import { z } from 'zod'

import { POST_LIMITS } from '../../constants/forum/postLimits'
import { tagsField } from '../utils/fields'

export const updatePostSchema = z.object({
    title: z.string().max(POST_LIMITS.MAX_TITLE_LENGTH).optional(),
    body: z.string().max(POST_LIMITS.MAX_BODY_LENGTH).optional(),
    category: z.string().optional(),
    tags: tagsField
})

export type UpdatePostType = z.infer<typeof updatePostSchema>
