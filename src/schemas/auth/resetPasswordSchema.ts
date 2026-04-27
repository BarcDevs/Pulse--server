import { z } from 'zod'

import { PASSWORD_FORMAT } from './passwordFormat'

export const resetPasswordSchema = z.object({
    email: z.string()
        .email()
        .describe('Email is required'),
    newPassword: z.string()
        .regex(PASSWORD_FORMAT)
        .describe('New password is required'),
    userOTP: z.number()
        .describe('OTP is required')
})
