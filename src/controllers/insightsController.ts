import type { Request, Response } from 'express'

import { errorFactory } from '../errors/factory/ErrorFactory'
import { successResponse } from '../responses/success'
import { getTodayObservation } from '../services/dailyObservationService'
import type { TodayObservationResponse } from '../types/data/DailyObservationType'

export const getObservation = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const data = await getTodayObservation(userId)

    return successResponse<TodayObservationResponse | null>(
        res,
        data,
        'Observation retrieved'
    )
}
