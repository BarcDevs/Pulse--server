import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const changeEmailSchema = z.object({
    newEmail: z.email('New email is required').toLowerCase(),
    password: z
        .string('Password is required')
        .regex(
            PASSWORD_FORMAT,
            'Password must be at least 8 characters and contain letters and numbers'
        )
})

export type ChangeEmailType = z.infer<typeof changeEmailSchema>
