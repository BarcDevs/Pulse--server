import joi from 'joi'

import type { UpdateRecoveryGoalType } from '../../types/data/RecoveryGoalType'

export const updateGoalSchema =
    joi.object<
        UpdateRecoveryGoalType
    >({
        title: joi
            .string()
            .max(150)
            .optional(),
        description: joi
            .string()
            .max(1000)
            .allow(null, '')
            .optional()
    })
