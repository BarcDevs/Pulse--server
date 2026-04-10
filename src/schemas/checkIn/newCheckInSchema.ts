import joi from 'joi'

import type { NewCheckInType } from '../../types/data/CheckInType'

export const newCheckInSchema =
    joi.object<Omit<NewCheckInType, 'userId'>>({
        moodScore: joi
            .number()
            .integer()
            .min(1)
            .max(10)
            .required(),
        painLevel: joi
            .number()
            .integer()
            .min(1)
            .max(10)
            .required(),
        activities: joi
            .array()
            .items(joi
                .string()
                .max(100))
            .required(),
        notes: joi
            .string()
            .max(500)
            .allow(null, '')
            .optional()
    })