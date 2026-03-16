import {
    comparePassword,
    createToken,
    hashPassword
} from '../lib/authCrypto'
import {generateCSRFToken} from '../lib/authCSRF'
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

    if (!user || !comparePassword(
        password,
        user.password
    )) {
        throw new Error('User not found!')
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
        throw new Error('User already exists!')

    const usernameExists =
        await authModel.getUserByUsername(
            newUser.username
        )

    if (usernameExists)
        throw new Error('Username already taken!')

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

export {
    comparePassword,
    createToken,
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