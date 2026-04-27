import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const loginSchema = z.object({
    email: z.string()
        .email()
        .describe('Email is required'),
    password: z.string()
        .regex(PASSWORD_FORMAT)
        .min(8)
        .describe('Password is required'),
    remember: z.boolean().default(false)
})
