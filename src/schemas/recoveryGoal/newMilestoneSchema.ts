import { z } from 'zod'

export const newMilestoneSchema = z.object({
    milestones: z.array(
        z.object({
            title: z.string('Milestone title is required')
                .max(150),
            description: z.string()
                .max(1000)
                .optional(),
            order: z.number('Milestone order is required')
                .int()
                .min(1)
        })
    ).min(1).max(8)
})
