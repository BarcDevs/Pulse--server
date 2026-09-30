import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const loginSchema = z.object({
    email: z.email('Email is required').toLowerCase(),
    password: z.string('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .regex(
            PASSWORD_FORMAT,
            'Password must be at least 8 characters and contain letters and numbers'
        ),
    remember: z.boolean().default(false)
})

export type LoginType = z.infer<typeof loginSchema>
