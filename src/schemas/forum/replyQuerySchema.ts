import { z } from 'zod'

import {
    cursorField,
    paginationFields
} from '../utils/fields'

export const replyQuerySchema = z.object({
    ...paginationFields,
    cursor: cursorField
}).refine(
    (query) => !(query.cursor && query.page),
    { message: 'cursor and page cannot be used together' }
)

export type ReplyQueryType = z.infer<typeof replyQuerySchema>
