import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const signupSchema = z.object({
    firstName: z.string('First name is required')
        .regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
    lastName: z.string('Last name is required')
        .regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric'),
    username: z.string().optional(),
    email: z.string('Email is required')
        .email(),
    password: z.string('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .regex(
            PASSWORD_FORMAT,
            'Must contain uppercase, lowercase, number, and special character'
        )
})
