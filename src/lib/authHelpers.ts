import type { CookieOptions } from 'express'
import ms from 'ms'

import { authConfig, isDev } from '../../config'
import { SESSION_EXPIRES_IN } from '../constants/auth/authRules'
import { ErrorCodes } from '../constants/errorCodes'
import { excludedUserFields } from '../constants/excludedUserFields'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { AuthError } from '../errors/AuthError'
import * as authModel from '../models/authModel'
import type {
    ServerUserType,
    UserType
} from '../types/data/UserType'

import {
    comparePassword,
    hashPassword
} from './authCrypto'

export const getCookiesOptions = (
    remember: boolean
) => ({
    httpOnly: true,
    // The client proxies /api through its own origin, so cookies are first-party
    sameSite: 'lax',
    secure: !isDev,
    maxAge: remember
        ? ms(authConfig.expiresIn)
        : ms(SESSION_EXPIRES_IN)
}) as CookieOptions

export const generateRandomUsername = () => {
    const timestamp = Date.now()
    const random = Math.floor(
        Math.random() * 10000
    )

    return `user${timestamp}${random}`
}

export const sanitizeUserData = (
    user: ServerUserType
): UserType =>
    Object.fromEntries(
        Object.entries(user).filter(
            ([key]) =>
                !excludedUserFields
                    .includes(
                        key as keyof ServerUserType
                    )
        )
    ) as UserType

export const updateUserData = async (
    userId: string,
    updates: {
        firstName?: string
        lastName?: string
        username?: string
        email?: string
    }
): Promise<ServerUserType> => {
    const existingUser = await authModel
        .getUserById(userId)
    if (!existingUser)
        throw new AuthError(
            'User not found!',
            ErrorCodes.NOT_FOUND,
            'id',
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    if (
        updates.email
        && updates.email !== existingUser.email
    ) {
        const emailExists = await authModel
            .getUserByEmailAnyStatus(updates.email)
        if (emailExists)
            throw new AuthError(
                'Email already in use!',
                ErrorCodes.AUTH_CONFLICT,
                'email',
                'Conflict',
                HttpStatusCodes.CONFLICT
            )
    }

    if (
        updates.username
        && updates.username !== existingUser.username
    ) {
        const usernameExists =
            await authModel
                .getUserByUsername(updates.username)
        if (usernameExists)
            throw new AuthError(
                'Username already taken!',
                ErrorCodes.AUTH_CONFLICT,
                'username',
                'Conflict',
                HttpStatusCodes.CONFLICT
            )
    }

    return authModel.updateUser(
        userId,
        updates
    )
}

export const updateUserPassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<ServerUserType> => {
    const user = await authModel
        .getUserById(userId)

    if (!user)
        throw new AuthError(
            'User not found!',
            ErrorCodes.NOT_FOUND,
            'id',
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    const isValidPassword = await comparePassword(
        currentPassword,
        user.password
    )

    if (!isValidPassword)
        throw new AuthError(
            'Invalid current password!',
            ErrorCodes.AUTH_UNAUTHORIZED,
            'currentPassword',
            'Unauthorized',
            HttpStatusCodes.UNAUTHORIZED
        )

    return authModel.updatePassword(
        userId,
        await hashPassword(newPassword)
    )
}