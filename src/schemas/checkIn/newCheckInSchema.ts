import joi from 'joi'

import type {NewCheckInType} from '../../types/data/CheckInType'

export const newCheckInSchema = joi.object<Omit<NewCheckInType, 'userId'>>({
    moodScore: joi.number().integer().min(1).max(10).required(),
    painLevel: joi.number().integer().min(1).max(10).required(),
    activities: joi.array().items(joi.string().min(1).max(100)).min(1).required(),
    notes: joi.string().max(500).optional(),
})