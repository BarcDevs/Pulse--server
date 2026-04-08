import joi from 'joi'

export const newMilestoneSchema = joi.object({
    title: joi
        .string()
        .max(150)
        .required()
})
