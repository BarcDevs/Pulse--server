import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    comparePassword,
    createToken,
    hashPassword
} from '../lib/authCrypto'
import * as authModel from '../models/authModel'
import type {
    NewUserType,
    ServerUserType
} from '../types/data/UserType'

export const getUser = async (
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

export const login = async (
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

export const signup = async (
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

export const resetPassword = async (
    userId: string,
    newPassword: string
): Promise<ServerUserType> =>
    authModel.updatePassword(
        userId,
        hashPassword(newPassword)
    )

export const updateEmail = (
    userId: string,
    newEmail: string
): Promise<ServerUserType> =>
    authModel.updateEmail(userId, newEmail)

export const deactivateUser = async (
    userId: string
): Promise<void> => {
    const user = await authModel.getUserById(userId)

    if (!user)
        throw errorFactory.generic.notFound('User')

    await authModel.disableUser(userId)
}