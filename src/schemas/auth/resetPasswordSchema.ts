import joi from 'joi'

import { PASSWORD_FORMAT } from './passwordFormat'

export const resetPasswordSchema = joi.object<{
    email: string
    newPassword: string
    userOTP: number
}>({
    email: joi
        .string()
        .email({
            minDomainSegments: 2,
            tlds: { allow: ['com', 'net'] }
        })
        .required(),
    newPassword: joi
        .string()
        .regex(PASSWORD_FORMAT)
        .required(),
    userOTP: joi.number().required()
})
