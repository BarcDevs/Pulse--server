import { z } from 'zod'

export const newCheckInSchema = z.object({
    moodScore: z.number('Mood score is required')
        .int()
        .min(1)
        .max(10),
    painLevel: z.number('Pain level is required')
        .int()
        .min(1)
        .max(10),
    activities: z.array(
        z.string()
            .max(100)
    ).min(1, 'Activities are required'),
    notes: z.string()
        .max(500)
        .optional()
})