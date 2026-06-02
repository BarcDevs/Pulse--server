import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

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
    email: z.string('Email is required')
        .email(),
    password: z.string('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .regex(
            PASSWORD_FORMAT,
            'Must contain uppercase, lowercase, number, and special character'
        )
})
