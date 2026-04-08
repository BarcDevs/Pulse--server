import joi from 'joi'

import type { UpdateMilestoneType } from '../../types/data/RecoveryGoalType'

export const updateMilestoneSchema = joi.object<
    UpdateMilestoneType
>({
    title: joi
        .string()
        .max(150)
        .optional(),
    isCompleted: joi
        .boolean()
        .optional()
})
