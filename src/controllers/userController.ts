import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { ValidationError } from '../errors/ValidationError'
import {
    sanitizeUserData,
    updateUserData,
    updateUserPassword
} from '../lib/authHelpers'
import { successResponse } from '../responses/success'
import { updatePasswordSchema } from '../schemas/user/updatePasswordSchema'
import { updateUserSchema } from '../schemas/user/updateUserSchema'
import { deactivateUser } from '../services/authService'
import type { UserType } from '../types/data/UserType'

export const updateUser = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData = ValidationError
        .catchValidationErrors(
            updateUserSchema.safeParse(req.body)
        )

    const updatedUser =
        await updateUserData(
            userId,
            validatedData
        )

    successResponse<{user: UserType}>(
        res,
        { user: sanitizeUserData(updatedUser) },
        'User updated successfully'
    )
}

export const updatePassword = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData = ValidationError
        .catchValidationErrors(
            updatePasswordSchema.safeParse(req.body)
        )

    const updatedUser = await updateUserPassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
    )

    successResponse<{user: UserType}>(
        res,
        { user: sanitizeUserData(updatedUser) },
        'Password updated successfully'
    )
}

export const deleteUser = async (
    req: Request,
    res: Response
) => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    await deactivateUser(userId)

    res.clearCookie('accessToken')
    res.clearCookie('_csrf')

    successResponse(
        res,
        null,
        'User account deactivated successfully',
        HttpStatusCodes.NO_CONTENT
    )
}