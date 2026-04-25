import joi from 'joi'

import type { UpdateMilestoneType } from '../../types/data/RecoveryGoalType'

export const updateMilestoneSchema = joi.object<
    UpdateMilestoneType
>({
    title: joi
        .string()
        .max(150)
        .optional(),
    description: joi
        .string()
        .max(1000)
        .allow(null, '')
        .optional(),
    order: joi
        .number()
        .integer()
        .min(1)
        .optional()
})
