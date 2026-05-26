import { z } from 'zod'

import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'

export const getGoalsQuerySchema = z.object({
    status: caseInsensitiveEnum([
        'active',
        'paused',
        'completed',
        'abandoned'
    ]).optional()
})
