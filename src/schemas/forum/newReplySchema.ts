import { z } from 'zod'

import { POST_LIMITS } from '../../constants/forum/postLimits'

export const newReplySchema = z.object({
    body: z.string('Body is required')
        .min(1)
        .max(POST_LIMITS.MAX_BODY_LENGTH),
    isAnonymous: z.boolean().optional()
})

export type NewReplyType = z.infer<typeof newReplySchema>
