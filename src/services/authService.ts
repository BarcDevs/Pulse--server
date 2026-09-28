import { DUMMY_PASSWORD_HASH } from '../constants/auth/authRules'
import { secondInMs } from '../constants/time'
import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    comparePassword,
    createToken,
    hashPassword,
    verifyToken
} from '../lib/authCrypto'
import { getTimezoneFromIp } from '../lib/geoLocation'
import * as authModel from '../models/authModel'
import * as profileModel from '../models/profileModel'
import { getSessionState } from '../models/sessionModel'
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

// A session dies when the user is deactivated or the password changes after
// the token was issued (iat is in whole seconds). DB errors propagate so an
// outage is a 500, not a forced logout.
export const getSessionUserId = async (
    token?: string
): Promise<string | null> => {
    if (!token) return null

    let payload: ReturnType<typeof verifyToken>
    try {
        payload = verifyToken(token)
    } catch {
        return null
    }

    const { id, iat } = payload
    if (!id || !iat) return null

    const session = await getSessionState(id)
    if (!session?.active) return null

    const passwordUpdatedAt = Math.floor(
        session.passwordUpdatedAt.getTime() / secondInMs
    )

    return passwordUpdatedAt <= iat ? id : null
}

export const applyDetectedTimezone = async (
    userId: string,
    currentTimezone?: string,
    ip?: string
): Promise<void> => {
    const detectedTimezone = ip
        ? getTimezoneFromIp(ip)
        : null

    if (
        detectedTimezone
        && detectedTimezone !== currentTimezone
    ) {
        await profileModel.updateProfile(
            userId,
            { timezone: detectedTimezone }
        )
    }
}

export const login = async (
    email: string,
    password: string,
    remember: boolean,
    ip?: string
): Promise<string> => {
    const user: ServerUserType | null =
        await getUser('email', email)

    const passwordMatches = comparePassword(
        password,
        user?.password ?? DUMMY_PASSWORD_HASH
    )

    if (!user || !passwordMatches) {
        throw errorFactory.auth.credentials()
    }

    await applyDetectedTimezone(
        user.id,
        user.profile?.timezone,
        ip
    )

    return createToken(user, remember)
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
): Promise<ServerUserType> => {
    await authModel.updatePassword(
        userId,
        hashPassword(newPassword)
    )

    return authModel.markEmailVerified(userId)
}

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