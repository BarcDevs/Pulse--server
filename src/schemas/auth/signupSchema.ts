import { z } from 'zod'

import { newPasswordField } from './passwordFormat'

export const signupSchema = z.object({
    firstName: z.string('First name is required')
        .regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
    lastName: z.string('Last name is required')
        .regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be 30 characters or fewer')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    email: z.email('Email is required'),
    password: newPasswordField('Password is required')
})

export type SignupType = z.infer<typeof signupSchema>
