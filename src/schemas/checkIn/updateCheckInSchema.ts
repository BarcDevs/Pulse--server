import { z } from 'zod'

import { activityItemField, scoreField } from '../utils/fields'

export const updateCheckInSchema = z
    .object({
        moodScore: scoreField.optional(),
        painLevel: scoreField.optional(),
        activities: z.array(activityItemField).optional(),
        notes: z.string().max(500).optional()
    })
    .refine(
        obj => Object.values(obj).some(v => v !== undefined),
        'At least one field must be provided'
    )
