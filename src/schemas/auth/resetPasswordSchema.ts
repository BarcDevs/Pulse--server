import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const resetPasswordSchema = z.object({
    email: z.string().email(),
    newPassword: z.string().regex(PASSWORD_FORMAT),
    userOTP: z.number()
})
