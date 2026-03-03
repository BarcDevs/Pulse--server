import joi from 'joi'

import type {UpdateCheckInType} from '../../types/data/CheckInType'

export const updateCheckInSchema = joi
    .object<
        Omit<UpdateCheckInType, 'userId'>
    >({
        moodScore: joi
            .number()
            .integer()
            .min(1)
            .max(10),
        painLevel: joi
            .number()
            .integer()
            .min(1)
            .max(10),
        activities: joi
            .array()
            .items(
                joi
                    .string()
                    .min(1)
                    .max(100)
            )
            .min(1),
        notes: joi
            .string()
            .max(500)
            .allow(null)
            .optional()
    })
    .min(1)