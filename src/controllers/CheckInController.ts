import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { errorFactory } from '../errors/factory'
import { ValidationError } from '../errors/ValidationError'
import { successResponse } from '../responses/success'
import { checkInQuerySchema } from '../schemas/checkIn/checkInQuerySchema'
import { newCheckInSchema } from '../schemas/checkIn/newCheckInSchema'
import { updateCheckInSchema } from '../schemas/checkIn/updateCheckInSchema'
import * as checkInService from '../services/checkInService'
import type {
    CheckInStatsType,
    CheckInType
} from '../types/data/CheckInType'

export const getCheckIns = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedQuery =
        ValidationError.catchValidationErrors(
            checkInQuerySchema.validate(req.query)
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
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData =
        ValidationError.catchValidationErrors(
            newCheckInSchema.validate(req.body)
        )

    const {
        checkIn,
        created
    } = await checkInService.createCheckIn({
        ...validatedData,
        userId
    })

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
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData =
        ValidationError.catchValidationErrors(
            updateCheckInSchema.validate(req.body)
        )

    const data = await checkInService.updateCheckIn({
        ...validatedData,
        userId
    })

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
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const data = await checkInService
        .getCheckInStats(userId)

    return successResponse<CheckInStatsType>(
        res,
        data,
        'Check-in stats retrieved'
    )
}