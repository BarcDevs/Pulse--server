import joi from 'joi'

import type { NewRecoveryGoalType } from '../../types/data/RecoveryGoalType'

export const newGoalSchema = joi.object<
    Omit<NewRecoveryGoalType, 'userId'>
>({
    title: joi
        .string()
        .max(150)
        .required(),
    description: joi
        .string()
        .max(1000)
        .allow(null, '')
        .optional()
})
