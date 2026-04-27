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
        'paused',
        'abandoned'
    ]).optional(),
    targetDate: z.string()
        .datetime({ offset: true })
        .optional(),
    isPrimary: z.boolean().optional()
})
