import { z } from 'zod'

import { PASSWORD_FORMAT } from '../auth/passwordFormat'

export const updatePasswordSchema = z.object({
    currentPassword: z.string()
        .describe('Current password is required'),
    newPassword: z.string()
        .regex(
            PASSWORD_FORMAT,
            'Password must contain at least 8 characters, including letters and numbers'
        )
        .describe('New password is required')
})