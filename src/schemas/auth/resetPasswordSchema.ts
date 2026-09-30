import { z } from 'zod'

import { newPasswordField } from './passwordFormat'

export const resetPasswordSchema = z.object({
    email: z.email('Email is required').toLowerCase(),
    newPassword: newPasswordField('New password is required'),
    userOTP: z.number('OTP is required')
})

export type ResetPasswordType
    = z.infer<typeof resetPasswordSchema>
