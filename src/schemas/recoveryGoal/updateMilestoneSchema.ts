import { z } from 'zod'

export const updateMilestoneSchema = z.object({
    title: z.string().max(150).optional(),
    description: z.string().max(1000).optional(),
    order: z.number().int().min(1).optional()
})
