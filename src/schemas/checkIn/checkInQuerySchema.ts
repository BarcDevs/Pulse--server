import joi from 'joi'

import type {CheckInQuery} from '../../types/query'

export const checkInQuerySchema = joi
    .object<CheckInQuery>({
        limit: joi
            .number()
            .integer()
            .min(1)
            .max(100)
            .optional()
    })