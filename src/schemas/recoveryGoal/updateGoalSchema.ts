import { z } from 'zod'

import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'
import { futureDateField } from '../utils/fields'

export const updateGoalSchema = z.object({
    title: z.string().max(150).optional(),
    description: z.string().max(1000).optional(),
    status: caseInsensitiveEnum([
        'ACTIVE',
        'PAUSED',
        'ABANDONED'
    ]).optional(),
    targetDate: futureDateField.optional(),
    isPrimary: z.boolean().optional()
})
