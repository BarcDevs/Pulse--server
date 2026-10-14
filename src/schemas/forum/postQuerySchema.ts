import { z } from 'zod'

import { PostFilter } from '../../types/query'
import {
    cursorField,
    paginationFields
} from '../utils/fields'

const postQueryShape = z.object({
    ...paginationFields,
    cursor: cursorField,
    filter: z.enum(PostFilter).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
    category: z.string().optional()
})

// hot and popular sort by counters that change while the client scrolls, so a
// cursor on them could skip or repeat posts; they stay on page-based paging
export const postQuerySchema = postQueryShape
    .refine(
        (query) => !(query.cursor && query.page),
        { message: 'cursor and page cannot be used together' }
    )
    .refine(
        (query) => !(
            query.cursor
            && (query.filter === PostFilter.HOT
                || query.filter === PostFilter.POPULAR)
        ),
        { message: 'cursor is not supported with the hot and popular filters' }
    )

// Saved posts page over the save rows, not the post ids, so they have no cursor
export const savedPostQuerySchema = postQueryShape.omit({ cursor: true })

export type PostQueryType = z.infer<typeof postQuerySchema>
