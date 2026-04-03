import crypto from 'crypto'
import type {Request, Response} from 'express'

import {
    googleOAuthConfig,
    isDev
} from '../../config'
import {HttpStatusCodes} from '../constants/httpStatusCodes'
import {
    hourInMs,
    minuteInMs
} from '../constants/time'
import {errorFactory} from '../errors/factory'
import {ValidationError} from '../errors/ValidationError'
import {successResponse} from '../responses/success'
import {confirmEmailSchema} from '../schemas/auth/confirmEmailSchema'
import {forgotPasswordSchema} from '../schemas/auth/forgotPasswordSchema'
import {loginSchema} from '../schemas/auth/loginSchema'
import {resetPasswordSchema} from '../schemas/auth/resetPasswordSchema'
import {signupSchema} from '../schemas/auth/signupSchema'
import * as authServices from '../services/authService'
import {
    generateCSRFToken,
    generateRandomUsername,
    getCookiesOptions,
    sanitizeUserData,
    sendEmailWithOTP,
    verifyResetPasswordOTP
} from '../services/authService'
import * as googleOAuthService from '../services/googleOAuthService'
import type {
    ServerUserType,
    UserType
} from '../types/data/UserType'

// region Login and Signup
export const login = async (
    req: Request,
    res: Response
) => {
    const {
        email,
        password,
        remember
    } = ValidationError.catchValidationErrors(
        loginSchema.validate(req.body)
    )

    const token = await authServices.login(email, password)
    const {
        csrfSecret,
        csrfToken: _csrf
    } = generateCSRFToken()

    const cookiesOptions = getCookiesOptions(remember)

    res.cookie('accessToken', token, cookiesOptions)
    res.cookie('_csrf', csrfSecret, {
        ...cookiesOptions,
        maxAge: hourInMs
    })

    successResponse<{
        token: string
        _csrf: string
    }>(
        res,
        {token, _csrf},
        'user logged in!'
    )
}

export const signup = async (
    req: Request,
    res: Response
) => {
    const userData =
        ValidationError.catchValidationErrors(
            signupSchema.validate(req.body)
        )

    const newUserCreated: ServerUserType =
        await authServices.register({
            ...userData,
            username:
                userData.username ||
                generateRandomUsername()
        })

    successResponse<{
        user: UserType
    }>(
        res,
        {user: sanitizeUserData(newUserCreated)},
        'user created!',
        HttpStatusCodes.CREATED
    )
}
// endregion

// region Authentication Session
export const logout = async (
    _req: Request,
    res: Response
) => {
    res.clearCookie('accessToken')
    res.clearCookie('_csrf')

    successResponse(
        res,
        {},
        'user logged out!'
    )
}

export const me = async (
    req: Request,
    res: Response
) => {
    const {userId} = req

    const user: ServerUserType | null =
        userId ?
            await authServices.getUser('id', userId) :
            null

    if (!user)
        throw errorFactory.auth.unauthorized()

    successResponse<{
        user: UserType
    }>(
        res,
        {user: sanitizeUserData(user)},
        'user info!'
    )
}

export const getCsrfToken = async (
    req: Request,
    res: Response
) => {
    const {
        csrfSecret,
        csrfToken: _csrf
    } = generateCSRFToken()
    const cookiesOptions =
        getCookiesOptions(false)

    res.cookie(
        '_csrf',
        csrfSecret,
        cookiesOptions
    )

    successResponse<{
        _csrf: string
    }>(
        res,
        {_csrf},
        'CSRF token generated!'
    )
}
// endregion

// region Password Reset Flow
export const forgotPassword = async (
    req: Request,
    res: Response
) => {
    const {email} =
        ValidationError.catchValidationErrors(
            forgotPasswordSchema.validate(
                {email: req.params.email}
            )
        )

    const otpCode = await sendEmailWithOTP(email)

    const OTP = isDev ? otpCode : null

    successResponse(
        res,
        {OTP},
        'We have sent you an email with an OTP to confirm your email! Please check your email.'
    )
}

export const confirmEmail = async (
    req: Request,
    res: Response
) => {
    const {OTP, email} =
        ValidationError.catchValidationErrors(
            confirmEmailSchema.validate(req.body)
        )

    const user: ServerUserType | null =
        await authServices.getUser(
            'email',
            email
        )

    const OTPValid =
        user &&
        verifyResetPasswordOTP(
            user.resetPasswordOTP!,
            user.resetPasswordExpiration!,
            OTP
        )

    if (!OTPValid)
        throw errorFactory.validation.otpError()

    successResponse<{
        user: UserType
    }>(
        res,
        {user: sanitizeUserData(user)},
        'Your email is confirmed!',
        HttpStatusCodes.CREATED
    )
}

export const resetPassword = async (
    req: Request,
    res: Response
) => {
    const {
        email,
        newPassword,
        userOTP
    } = ValidationError.catchValidationErrors(
        resetPasswordSchema.validate(req.body)
    )

    const user: ServerUserType | null =
        await authServices.getUser(
            'email',
            email
        )

    if (
        !user ||
        !verifyResetPasswordOTP(
            user.resetPasswordOTP!,
            user.resetPasswordExpiration!,
            userOTP
        )
    )
        throw errorFactory.auth.resetPassword()

    await authServices.resetPassword(user.id, newPassword)
    await authServices.removeResetPasswordOTP(user.id)

    successResponse<{
        user: UserType
    }>(
        res,
        {user: sanitizeUserData(user)},
        'Password has changed successfully!'
    )
}
// endregion

// region Google OAuth
export const googleSignIn = async (
    _req: Request,
    res: Response
) => {
    const state = crypto
        .randomBytes(32)
        .toString('hex')

    res.cookie('oauth_state', state, {
        httpOnly: true,
        sameSite: isDev ? 'none' : 'lax',
        secure: true,
        maxAge: 10 * minuteInMs
    })

    const authUrl =
        googleOAuthService.buildAuthUrl(state)

    res.redirect(authUrl)
}

export const googleCallback = async (
    req: Request,
    res: Response
) => {
    const {code, state} = req.query
    const storedState = req.cookies?.oauth_state

    res.clearCookie('oauth_state')

    if (
        !state ||
        !storedState ||
        state !== storedState
    )
        throw errorFactory.auth.unauthorized(
            'Invalid OAuth state'
        )

    if (!code || typeof code !== 'string')
        throw errorFactory.auth.unauthorized(
            'Failed to authenticate with Google'
        )

    const user =
        await googleOAuthService.handleCallback(
            code
        )

    const token = authServices.createToken(user)
    const {
        csrfSecret,
        csrfToken: _csrf
    } = generateCSRFToken()

    const cookiesOptions =
        getCookiesOptions(false)

    res.cookie(
        'accessToken',
        token,
        cookiesOptions
    )
    res.cookie('_csrf', csrfSecret, {
        ...cookiesOptions,
        maxAge: hourInMs
    })

    res.redirect(googleOAuthConfig.clientUrl)
}
// endregion
