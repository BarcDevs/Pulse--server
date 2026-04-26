import { z } from 'zod'

export const newCheckInSchema = z.object({
    moodScore: z.number().int().min(1).max(10),
    painLevel: z.number().int().min(1).max(10),
    activities: z.array(z.string().max(100)),
    notes: z.string().max(500).optional()
})