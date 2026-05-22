import { z } from 'zod'

export const paginationFields = {
    limit: z.coerce
        .number()
        .int()
        .max(100)
        .optional(),
    page: z.coerce
        .number()
        .int()
        .optional()
}

export const tagsField = z.array(z.string())
    .optional()

export const tagNameField = z.string()
    .min(1)
    .max(100)

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
