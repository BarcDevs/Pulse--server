import { z } from 'zod'

export const updateUserSchema = z.object({
    firstName: z.string()
        .min(1)
        .max(100)
        .optional(),
    lastName: z.string()
        .min(1)
        .max(100)
        .optional(),
    username: z.string()
        .regex(/^[a-zA-Z0-9]+$/)
        .min(3)
        .max(30)
        .optional()
})