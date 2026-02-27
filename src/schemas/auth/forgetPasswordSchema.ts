import joi from 'joi'

export const forgetPasswordSchema = joi.object<{email: string}>({
    email: joi
        .string()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
        .required()
})
