import { z } from 'zod'

import { POST_LIMITS } from '../../constants/forum/postLimits'

export const paginationFields = {
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional(),
    page: z.coerce
        .number()
        .int()
        .min(1)
        .optional()
}

export const tagNameField = z.string()
    .min(1)
    .max(100)

export const tagsField = z.array(tagNameField)
    .max(POST_LIMITS.MAX_TAGS)
    .optional()

export const scoreField = z.number()
    .int()
    .min(1)
    .max(10)

export const activityItemField = z.string()
    .max(100)

export const futureDateField = z.string()
    .datetime({ offset: true })
    .refine(
        (date) => new Date(date) > new Date(),
        'Target date must be in the future'
    )
