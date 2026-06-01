import { z } from 'zod'

import { paginationFields } from '../utils/fields'

export const replyQuerySchema = z.object({
    ...paginationFields
})
