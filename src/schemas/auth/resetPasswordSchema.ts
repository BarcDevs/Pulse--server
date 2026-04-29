import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const resetPasswordSchema = z.object({
    email: z.string('Email is required')
        .email(),
    newPassword: z.string('New password is required')
        .regex(PASSWORD_FORMAT),
    userOTP: z.number('OTP is required')
})
