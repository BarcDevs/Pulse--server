import joi from 'joi'

export const updateUserSchema = joi.object<{
    firstName?: string
    lastName?: string
    username?: string
    email?: string
}>({
    firstName: joi
        .string()
        .min(1)
        .max(100)
        .optional(),
    lastName: joi
        .string()
        .min(1)
        .max(100)
        .optional(),
    username: joi
        .string()
        .alphanum()
        .min(3)
        .max(30)
        .optional(),
    email: joi
        .string()
        .email({
            minDomainSegments: 2,
            tlds: { allow: ['com', 'net'] }
        })
        .optional()
})