import { z } from 'zod'

import { newPasswordField } from '../auth/passwordFormat'

export const updatePasswordSchema = z.object({
    currentPassword: z.string('Current password is required'),
    newPassword: newPasswordField('New password is required')
})
export type UpdatePasswordType
    = z.infer<typeof updatePasswordSchema>
