import joi from 'joi'

import type { NewRecoveryGoalType } from '../../types/data/RecoveryGoalType'

export const newGoalSchema = joi.object<
    NewRecoveryGoalType
>({
    title: joi
        .string()
        .max(150)
        .required(),
    description: joi
        .string()
        .max(1000)
        .allow(null, '')
        .optional(),
    category: joi
        .string()
        .valid(
            'physical',
            'mental',
            'lifestyle'
        )
        .required(),
    targetDate: joi
        .string()
        .isoDate()
        .optional(),
    isPrimary: joi
        .boolean()
        .optional()
})
