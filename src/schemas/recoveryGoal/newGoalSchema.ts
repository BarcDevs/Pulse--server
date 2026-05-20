import { z } from 'zod'

import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'
import { futureDateField } from '../utils/fields'

export const newGoalSchema = z.object({
    title: z.string('Title is required').max(150),
    description: z.string().max(1000).optional(),
    category: caseInsensitiveEnum([
        'physical',
        'mental',
        'lifestyle'
    ]),
    targetDate: futureDateField.optional(),
    isPrimary: z.boolean().optional()
})
