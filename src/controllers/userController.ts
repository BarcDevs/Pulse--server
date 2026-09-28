import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { createToken } from '../lib/authCrypto'
import {
    getCookiesOptions,
    sanitizeUserData,
    updateUserData,
    updateUserPassword
} from '../lib/authHelpers'
import { successResponse } from '../responses/success'
import type { UpdatePasswordType } from '../schemas/user/updatePasswordSchema'
import { updatePasswordSchema } from '../schemas/user/updatePasswordSchema'
import type { UpdateUserType } from '../schemas/user/updateUserSchema'
import { updateUserSchema } from '../schemas/user/updateUserSchema'
import { deactivateUser } from '../services/authService'
import type { UserType } from '../types/data/UserType'
import {
    extractUserId,
    validateAndExtract
} from '../utils/controllerHelpers'

export const updateUser = async (
    req: Request,
    res: Response
) => {
    const userId = extractUserId(req)

    const validatedData = validateAndExtract<UpdateUserType>(
        updateUserSchema,
        req.body
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
    const userId = extractUserId(req)

    const validatedData = validateAndExtract<UpdatePasswordType>(
        updatePasswordSchema,
        req.body
    )

    const updatedUser = await updateUserPassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
    )

    // The password change revokes every existing token, this one included
    res.cookie(
        'accessToken',
        createToken(updatedUser),
        getCookiesOptions(false)
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
    const userId = extractUserId(req)

    await deactivateUser(userId)

    res.clearCookie('accessToken')
    res.clearCookie('_csrf')

    successResponse(
        res,
        null,
        'User account deactivated successfully',
        HttpStatusCodes.OK
    )
}