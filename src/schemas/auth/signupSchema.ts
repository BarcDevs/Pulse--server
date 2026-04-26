import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const signupSchema = z.object({
    firstName: z.string().regex(/^[a-zA-Z0-9]+$/),
    lastName: z.string().regex(/^[a-zA-Z0-9]+$/),
    username: z.string().optional(),
    email: z.string().email(),
    password: z.string().regex(PASSWORD_FORMAT).min(8)
})
