import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().regex(PASSWORD_FORMAT).min(8),
    remember: z.boolean().default(false)
})
