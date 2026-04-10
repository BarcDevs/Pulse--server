import { errorFactory } from '../errors/factory'
import {
    comparePassword,
    createToken,
    hashPassword
} from '../lib/authCrypto'
import { generateCSRFToken } from '../lib/authCSRF'
import {
    generateRandomUsername,
    getCookiesOptions,
    sanitizeUserData,
    updateUserData,
    updateUserPassword
} from '../lib/authHelpers'
import {
    removeResetPasswordOTP,
    sendEmailWithOTP,
    verifyResetPasswordOTP
} from '../lib/authOTP'
import * as authModel from '../models/AuthModel'
import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'

const getUser = async (
    by: 'email' | 'id',
    value: string
) => {
    let user: ServerUserType | null
    switch (by) {
        case 'email':
            user = await authModel.getUserByEmail(value)
            break
        case 'id':
            user = await authModel.getUserById(value)
            break
        default:
            user = null
            break
    }

    return user
}

const login = async (
    email: string,
    password: string
): Promise<string> => {
    const user: ServerUserType | null =
        await getUser('email', email)

    if (!user) {
        throw errorFactory.auth.credentials(
            'User not found!'
        )
    }

    if (!comparePassword(password, user.password)) {
        throw errorFactory.auth.credentials(
            'Invalid password!'
        )
    }

    return createToken(user)
}

const register = async (
    newUser: NewUserType
): Promise<ServerUserType> => {
    const userExists: ServerUserType | null =
        await authModel.getUserByEmail(
            newUser.email
        )

    if (userExists)
        throw errorFactory.auth.conflict(
            'User already exists!'
        )

    const usernameExists =
        await authModel.getUserByUsername(
            newUser.username
        )

    if (usernameExists)
        throw errorFactory.auth.conflict(
            'Username already taken!'
        )

    const passwordHash =
        hashPassword(newUser.password)

    const userWithHashedPassword = {
        ...newUser,
        password: passwordHash
    }

    return authModel.createUser(
        userWithHashedPassword
    )
}

const resetPassword = async (
    userId: string,
    newPassword: string
): Promise<ServerUserType> =>
    authModel.updateUser(userId, {
        password: hashPassword(newPassword)
    })

const deactivateUser = async (
    userId: string
): Promise<void> => {
    const user = await authModel.getUserById(userId)

    if (!user)
        throw errorFactory.generic.notFound('User')

    await authModel.disableUser(userId)
}

export {
    comparePassword,
    createToken,
    deactivateUser,
    generateCSRFToken,
    generateRandomUsername,
    getCookiesOptions,
    getUser,
    hashPassword,
    login,
    register,
    removeResetPasswordOTP,
    resetPassword,
    sanitizeUserData,
    sendEmailWithOTP,
    updateUserData,
    updateUserPassword,
    verifyResetPasswordOTP
}