import type { Request, Response } from 'express'

import { errorFactory } from '../errors/factory/ErrorFactory'
import { successResponse } from '../responses/success'
import * as recommendationsService from '../services/recommendationsService'
import type { RecommendationFeedResponse } from '../types/data/RecommendationType'

export const getRecommendations = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const data =
        await recommendationsService.getRecommendations(userId)

    return successResponse<RecommendationFeedResponse>(
        res,
        data,
        'Recommendations retrieved'
    )
}
