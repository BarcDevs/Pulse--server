import type {CookieOptions} from 'express'
import ms from 'ms'

import {authConfig, isDev} from '../../config'
import {excludedUserFields} from '../constants/excludedUserFields'
import {HttpStatusCodes} from '../constants/httpStatusCodes'
import {AuthError} from '../errors/AuthError'
import type {
    ServerUserType,
    UserType
} from '../types/data/UserType'
import * as authModel from '../models/AuthModel'

import {
    comparePassword,
    hashPassword
} from './authCrypto'

const getCookiesOptions = (
    remember: boolean
) => ({
    httpOnly: true,
    sameSite: !isDev ? 'none' : 'lax',
    secure: !isDev,
    maxAge: remember ?
        ms(authConfig.expiresIn) :
        ms('1d')
}) as CookieOptions

const generateRandomUsername = () => {
    const timestamp = Date.now()
    const random = Math.floor(
        Math.random() * 10000
    )

    return `user${timestamp}${random}`
}

const sanitizeUserData = (
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

const updateUserData = async (
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
            'id',
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    if (
        updates.email &&
        updates.email !== existingUser.email
    ) {
        const emailExists = await authModel
            .getUserByEmail(updates.email)
        if (emailExists)
            throw new AuthError(
                'Email already in use!',
                'email',
                'Conflict',
                HttpStatusCodes.CONFLICT
            )
    }

    if (
        updates.username &&
        updates.username !== existingUser.username
    ) {
        const usernameExists =
            await authModel
                .getUserByUsername(updates.username)
        if (usernameExists)
            throw new AuthError(
                'Username already taken!',
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

const updateUserPassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<ServerUserType> => {
    const user = await authModel
        .getUserById(userId)

    if (!user)
        throw new AuthError(
            'User not found!',
            'id',
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    const isValidPassword = comparePassword(
        currentPassword,
        user.password
    )

    if (!isValidPassword)
        throw new AuthError(
            'Invalid current password!',
            'currentPassword',
            'Unauthorized',
            HttpStatusCodes.UNAUTHORIZED
        )

    return authModel.updatePassword(
        userId,
        hashPassword(newPassword)
    )
}

export {
    getCookiesOptions,
    generateRandomUsername,
    sanitizeUserData,
    updateUserData,
    updateUserPassword
}