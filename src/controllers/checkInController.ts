import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { successResponse } from '../responses/success'
import type { CheckInQueryType } from '../schemas/checkIn/checkInQuerySchema'
import { checkInQuerySchema } from '../schemas/checkIn/checkInQuerySchema'
import type { NewCheckInType } from '../schemas/checkIn/newCheckInSchema'
import { newCheckInSchema } from '../schemas/checkIn/newCheckInSchema'
import type { UpdateCheckInType } from '../schemas/checkIn/updateCheckInSchema'
import { updateCheckInSchema } from '../schemas/checkIn/updateCheckInSchema'
import * as checkInService from '../services/checkInService'
import * as progressInsightsService from '../services/progressInsightsService'
import type {
    CheckInStatsType,
    CheckInType
} from '../types/data/CheckInType'
import type { ProgressInsight } from '../types/data/ProgressInsightType'
import { extractUserId, validateAndExtract } from '../utils/controllerHelpers'

export const getCheckIns = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const validatedQuery = validateAndExtract<CheckInQueryType>(
        checkInQuerySchema,
        req.query
    )

    const data = await checkInService.getCheckIns(
        userId,
        validatedQuery
    )

    return successResponse<CheckInType[]>(
        res,
        data,
        `${data.length} check-ins found`
    )
}

export const createCheckIn = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const validatedData = validateAndExtract<NewCheckInType>(
        newCheckInSchema,
        req.body
    )

    const {
        checkIn,
        created
    } = await checkInService.createCheckIn(
        {
            ...validatedData,
            userId
        },
        { isGuest: req.isGuest }
    )

    return successResponse<CheckInType>(
        res,
        checkIn,
        created
            ? 'Check-in created successfully'
            : 'Check-in updated successfully',
        created
            ? HttpStatusCodes.CREATED
            : HttpStatusCodes.OK
    )
}

export const updateCheckIn = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const validatedData = validateAndExtract<UpdateCheckInType>(
        updateCheckInSchema,
        req.body
    )

    const data = await checkInService.updateCheckIn(
        {
            ...validatedData,
            userId
        },
        { isGuest: req.isGuest }
    )

    return successResponse<CheckInType>(
        res,
        data,
        'Check-in updated successfully'
    )
}

export const getCheckInStats = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const data = await checkInService
        .getCheckInStats(userId)

    return successResponse<CheckInStatsType>(
        res,
        data,
        'Check-in stats retrieved'
    )
}

export const getProgressInsights = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const data = await progressInsightsService
        .generateProgressInsight(
            userId,
            { isGuest: req.isGuest }
        )

    return successResponse<ProgressInsight>(
        res,
        data,
        'Progress insights generated'
    )
}