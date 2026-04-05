import Joi from 'joi'

export const updateProfileSchema = Joi.object({
    image: Joi.string().uri().allow(null).optional(),
    bio: Joi.string().max(500).allow(null).optional(),
    location: Joi.string()
        .max(100)
        .allow(null)
        .optional(),
    timezone: Joi.string()
        .pattern(
            /^([A-Z][A-Za-z]+\/[A-Za-z0-9_]+|UTC)$/
        )
        .allow(null)
        .optional(),
    theme: Joi.string()
        .valid('light', 'dark')
        .optional(),
    language: Joi.string()
        .max(10)
        .optional(),
    dailyReminder: Joi.boolean().optional(),
    communityAlerts: Joi.boolean().optional(),
    profileVisibility: Joi.string()
        .valid('onlyMe', 'friends', 'public')
        .optional(),
    anonymousParticipation: Joi.boolean().optional()
})

export const addHealthInterestsSchema =
    Joi.object({
        slugs: Joi.array()
            .items(
                Joi.string()
                    .required()
                    .max(50)
            )
            .required()
    })

export const addActivityPreferencesSchema =
    Joi.object({
        slugs: Joi.array()
            .items(
                Joi.string()
                    .required()
                    .max(50)
            )
            .required()
    })

export const slugParamSchema = Joi.object({
    slug: Joi.string()
        .required()
        .max(50)
})