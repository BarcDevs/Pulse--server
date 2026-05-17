import { z } from 'zod'

export const updateUserSchema = z.object({
    firstName: z.string()
        .min(1, 'First name is required')
        .max(100, 'First name must be 100 characters or fewer')
        .optional(),
    lastName: z.string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must be 100 characters or fewer')
        .optional(),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be 30 characters or fewer')
        .regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric')
        .optional()
})
