import { z } from 'zod'

import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'

export const updateGoalSchema = z.object({
    title: z.string()
        .max(150)
        .optional(),
    description: z.string()
        .max(1000)
        .optional(),
    status: caseInsensitiveEnum([
        'ACTIVE',
        'PAUSED',
        'ABANDONED'
    ]).optional(),
    targetDate: z.string()
        .datetime({ offset: true })
        .refine(
            (date) => new Date(date) > new Date(),
            'Target date must be in the future'
        )
        .optional(),
    isPrimary: z.boolean().optional()
})
