import { z } from 'zod'

export const newMilestoneSchema = z.object({
    title: z.string('Milestone title is required')
        .min(1)
        .max(150),
    description: z.string()
        .max(1000)
        .optional()
})
