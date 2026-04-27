import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const signupSchema = z.object({
    firstName: z.string()
        .regex(/^[a-zA-Z0-9]+$/)
        .describe('First name is required'),
    lastName: z.string()
        .regex(/^[a-zA-Z0-9]+$/)
        .describe('Last name is required'),
    username: z.string().optional(),
    email: z.string()
        .email()
        .describe('Email is required'),
    password: z.string()
        .regex(PASSWORD_FORMAT)
        .min(8)
        .describe('Password is required')
})
