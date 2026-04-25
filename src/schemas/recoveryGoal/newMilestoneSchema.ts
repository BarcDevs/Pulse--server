import joi from 'joi'

export const newMilestoneSchema = joi.object({
    milestones: joi
        .array()
        .items(
            joi.object({
                title: joi
                    .string()
                    .max(150)
                    .required(),
                description: joi
                    .string()
                    .max(1000)
                    .allow(null, '')
                    .optional(),
                order: joi
                    .number()
                    .integer()
                    .min(1)
                    .required()
            })
        )
        .min(1)
        .max(8)
        .required()
})
