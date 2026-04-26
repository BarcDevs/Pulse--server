import { z } from 'zod'

export const updateCheckInSchema = z
    .object({
        moodScore: z.number().int().min(1).max(10).optional(),
        painLevel: z.number().int().min(1).max(10).optional(),
        activities: z.array(z.string().max(100)).optional(),
        notes: z.string().max(500).optional()
    })
    .refine(
        obj => Object.values(obj).some(v => v !== undefined),
        'At least one field must be provided'
    )