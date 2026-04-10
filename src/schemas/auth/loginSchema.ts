import joi from 'joi'

import { PASSWORD_FORMAT } from './passwordFormat'

export const loginSchema = joi.object<{
    email: string
    password: string
    remember: boolean
}>({
    email: joi
        .string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
        .required(),
    password: joi.string().regex(PASSWORD_FORMAT).min(8).required(),
    remember: joi.boolean().optional()
})
