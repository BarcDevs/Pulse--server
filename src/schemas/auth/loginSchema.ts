import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const loginSchema = z.object({
    email: z.string('Email is required')
        .email(),
    password: z.string('Password is required')
        .regex(PASSWORD_FORMAT)
        .min(8),
    remember: z.boolean().default(false)
})
