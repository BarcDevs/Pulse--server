import { z } from 'zod'

export const newCheckInSchema = z.object({
    moodScore: z.number()
        .int()
        .min(1)
        .max(10)
        .describe('Mood score is required'),
    painLevel: z.number()
        .int()
        .min(1)
        .max(10)
        .describe('Pain level is required'),
    activities: z.array(z.string().max(100))
        .describe('Activities are required'),
    notes: z.string().max(500).optional()
})