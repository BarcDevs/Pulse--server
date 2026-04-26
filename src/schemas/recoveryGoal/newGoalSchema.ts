import { z } from 'zod'

export const newGoalSchema = z.object({
    title: z.string().max(150),
    description: z.string().max(1000).optional(),
    category: z.enum(['physical', 'mental', 'lifestyle']),
    targetDate: z.string().datetime({ offset: true }).optional(),
    isPrimary: z.boolean().optional()
})
