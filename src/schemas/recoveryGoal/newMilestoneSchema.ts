import { z } from 'zod'

export const newMilestoneSchema = z.object({
    milestones: z.array(
        z.object({
            title: z.string()
                .max(150)
                .describe('Milestone title is required'),
            description: z.string().max(1000).optional(),
            order: z.number()
                .int()
                .min(1)
                .describe('Milestone order is required')
        })
    ).min(1).max(8)
})
