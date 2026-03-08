import bcrypt from 'bcrypt'
import Csrf from 'csrf'
import type {CookieOptions} from 'express'
import jwt from 'jsonwebtoken'
import ms from 'ms'

import {authConfig, env} from '../../config'
import {excludedUserFields} from '../constants/excludedUserFields'
import {HttpStatusCodes} from '../constants/httpStatusCodes'
import {AuthError} from '../errors/AuthError'
import * as authModel from '../models/AuthModel'
import type {
    NewUserType,
    ServerUserType,
    UserType
} from '../types/data/UserType'
import {sendEmail} from '../utils/emailSender'

const csrfProtection = new Csrf()

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

const getCookiesOptions = (remember: boolean) => ({
    httpOnly: true,
    sameSite: env === 'production' ? 'none' : 'lax',
    secure: env === 'production',
    maxAge: remember ?
        ms(authConfig.expiresIn) :
        ms('1d')
}) as CookieOptions

const generateResetPasswordOTP = (): {
    OTP: number
    OTPExpiration: Date
} => {
    const OTP = Math.floor(100000 + Math.random() * 900000)
    const OTPExpiration =
        new Date(Date.now() +
            ms(authConfig.otp_expiration)) // 10 minutes

    return {
        OTP,
        OTPExpiration
    }
}

const removeResetPasswordOTP = async (
    userId: string
): Promise<void> => {
    await authModel.setUserOTP(userId, {
        resetPasswordOTP: null,
        resetPasswordExpiration: null,
        password_updated_at: new Date(Date.now())
    })
}

const verifyResetPasswordOTP = (
    resetPasswordOTP: number,
    resetPasswordExpiration: Date,
    OTP: number
): boolean => {
    const now = new Date()
    return now < resetPasswordExpiration &&
        resetPasswordOTP === +OTP
}

const sendEmailWithOTP = async (
    email: string
): Promise<boolean> => {
    const user: ServerUserType | null =
        await authModel.getUserByEmail(email)

    if (!user) return false

    const {OTP, OTPExpiration} =
        generateResetPasswordOTP()

    await authModel.setUserOTP(
        user.id, {
            resetPasswordOTP: OTP,
            resetPasswordExpiration: OTPExpiration
        })

    sendEmail(
        email,
        'Confirm Email',
        `here is your OTP for confirm email: ${OTP}`
    )

    return true
}

const createToken = (user: ServerUserType): string => {
    const payload = {
        id: user.id,
        email: user.email
    }
    const options: jwt.SignOptions = {
        expiresIn: authConfig.expiresIn as
            jwt.SignOptions['expiresIn']
    }

    return jwt.sign(payload, authConfig.jwtSecret!, options)
}

const generateCSRFToken = () => {
    const csrfSecret = csrfProtection.secretSync()
    const csrfToken = csrfProtection.create(csrfSecret)

    return {
        csrfSecret,
        csrfToken
    }
}

const hashPassword = (password: string): string =>
    bcrypt.hashSync(password, 10)

const comparePassword = (
    password: string,
    hashedPassword: string
): boolean =>
    bcrypt.compareSync(
        password,
        hashedPassword
    )

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
        throw new AuthError('User not found!')
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
        throw new AuthError(
            'User already exists!',
            'email',
            'Conflict',
            HttpStatusCodes.CONFLICT
        )

    const PasswordHash =
        hashPassword(newUser.password)

    const userAfterHashedPassword = {
        ...newUser,
        password: PasswordHash
    }

    return authModel.createUser(
        userAfterHashedPassword
    )
}

const resetPassword = async (
    userId: string,
    newPassword: string
): Promise<ServerUserType> =>
    authModel.updateUser(userId, {
        password: hashPassword(newPassword)
    })

const generateRandomUsername = () =>
    `user${Math.floor(Math.random() * 100000000000)}`

const sanitizeUserData = (
    user: ServerUserType
): UserType =>
    Object.fromEntries(
        Object.entries(user).filter(
            ([key]) => !excludedUserFields
                .includes(key as keyof ServerUserType)
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
    const user = await authModel.getUserById(userId)

    if (!user)
        throw new AuthError(
            'User not found!',
            'id',
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    if (!comparePassword(
        currentPassword,
        user.password
    ))
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
