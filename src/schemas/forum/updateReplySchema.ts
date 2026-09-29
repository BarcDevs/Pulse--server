import { z } from 'zod'

import { POST_LIMITS } from '../../constants/forum/postLimits'

export const updateReplySchema = z.object({
    body: z.string().max(POST_LIMITS.MAX_BODY_LENGTH).optional()
})

export type UpdateReplyType = z.infer<typeof updateReplySchema>
