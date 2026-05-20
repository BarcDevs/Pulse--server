import { z } from 'zod'

import { activityItemField, scoreField } from '../utils/fields'

export const newCheckInSchema = z.object({
    moodScore: scoreField,
    painLevel: scoreField,
    activities: z.array(activityItemField).min(1, 'Activities are required'),
    notes: z.string().max(500).optional()
})
