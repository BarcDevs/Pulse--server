import joi from 'joi'

import { PASSWORD_FORMAT } from '../auth/passwordFormat'

export const updatePasswordSchema = joi.object<{
    currentPassword: string
    newPassword: string
}>({
    currentPassword: joi
        .string()
        .required(),
    newPassword: joi
        .string()
        .regex(PASSWORD_FORMAT)
        .required()
        .messages({
            'string.pattern.base':
                'Password must contain at least 8 characters, including letters and numbers'
        })
})