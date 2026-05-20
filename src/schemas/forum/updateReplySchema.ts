import { z } from 'zod'

import { voteField } from '../utils/fields'

export const updateReplySchema = z.object({
    body: z.string().optional(),
    vote: voteField
})
