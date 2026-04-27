import { z } from 'zod'

import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'

export const newGoalSchema = z.object({
    title: z.string().max(150),
    description: z.string().max(1000).optional(),
    category: caseInsensitiveEnum([
        'physical',
        'mental',
        'lifestyle'
    ]),
    targetDate: z.string()
        .datetime({ offset: true })
        .optional(),
    isPrimary: z.boolean().optional()
})
