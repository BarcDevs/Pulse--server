import type { Request, Response } from 'express'

import { isDev } from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { createToken } from '../lib/authCrypto'
import {
    getCookiesOptions,
    sanitizeUserData,
    updateUserData,
    updateUserPassword
} from '../lib/authHelpers'
import {
    recordFailedDeleteAccountAttempt,
    sendDeleteAccountOTP,
    verifyOTP
} from '../lib/authOTP'
import { successResponse } from '../responses/success'
import type { DeleteAccountType } from '../schemas/user/deleteAccountSchema'
import { deleteAccountSchema } from '../schemas/user/deleteAccountSchema'
import type { UpdatePasswordType } from '../schemas/user/updatePasswordSchema'
import { updatePasswordSchema } from '../schemas/user/updatePasswordSchema'
import type { UpdateUserType } from '../schemas/user/updateUserSchema'
import { updateUserSchema } from '../schemas/user/updateUserSchema'
import {
    deactivateUser,
    getUser
} from '../services/authService'
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

export const requestDeleteAccountCode = async (
    req: Request,
    res: Response
) => {
    const user = await getUser('id', extractUserId(req))
    if (!user)
        throw errorFactory.auth.unauthorized()

    const otpCode = await sendDeleteAccountOTP(user)

    const OTP = isDev ? otpCode : null

    successResponse(
        res,
        { OTP },
        'Verification code sent to your email address!'
    )
}

export const deleteUser = async (
    req: Request,
    res: Response
) => {
    const { OTP } = validateAndExtract<DeleteAccountType>(
        deleteAccountSchema,
        req.body
    )

    const user = await getUser('id', extractUserId(req))
    if (!user)
        throw errorFactory.auth.unauthorized()

    if (
        !user.deleteAccountOTP
        || !user.deleteAccountExpiration
    )
        throw errorFactory.validation.otpError()

    if (
        !verifyOTP(
            user.deleteAccountOTP,
            user.deleteAccountExpiration,
            OTP
        )
    ) {
        await recordFailedDeleteAccountAttempt(
            user.id,
            user.deleteAccountAttempts
        )
        throw errorFactory.validation.otpError()
    }

    // disableUser also clears the code
    await deactivateUser(user.id)

    res.clearCookie('accessToken')
    res.clearCookie('_csrf')

    successResponse(
        res,
        null,
        'Account scheduled for deletion',
        HttpStatusCodes.OK
    )
}