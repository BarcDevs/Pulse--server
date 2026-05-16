import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const changeEmailSchema = z.object({
    newEmail: z.string('New email is required').email(),
    password: z
        .string('Password is required')
        .regex(PASSWORD_FORMAT)
})
