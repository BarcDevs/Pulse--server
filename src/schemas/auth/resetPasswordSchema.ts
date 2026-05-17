import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const resetPasswordSchema = z.object({
    email: z.string('Email is required')
        .email(),
    newPassword: z.string('New password is required')
        .min(8, 'Password must be at least 8 characters')
        .regex(
            PASSWORD_FORMAT,
            'Password must be at least 8 characters and contain letters and numbers'
        ),
    userOTP: z.number('OTP is required')
})
