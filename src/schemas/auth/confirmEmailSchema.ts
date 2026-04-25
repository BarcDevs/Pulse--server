import joi from 'joi'

// todo: replace joi with zod
export const confirmEmailSchema = joi.object<{
    email: string
    OTP: number
}>({
    email: joi
        .string()
        .email({
            minDomainSegments: 2,
            tlds: { allow: ['com', 'net'] }
        })
        .required(),
    OTP: joi.number().required()
})
