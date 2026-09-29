import crypto from 'crypto'
import type { Request, Response } from 'express'

import {
    googleOAuthConfig,
    isDev
} from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import {
    hourInMs,
    minuteInMs
} from '../constants/time'
import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    comparePassword,
    createToken
} from '../lib/authCrypto'
import { generateCSRFToken } from '../lib/authCSRF'
import {
    generateRandomUsername,
    getCookiesOptions,
    sanitizeUserData
} from '../lib/authHelpers'
import {
    assertResetPasswordOTP,
    recordFailedConfirmEmailAttempt,
    removeConfirmEmailOTP,
    removeResetPasswordOTP,
    sendEmailChangeOTP,
    sendForgotPasswordOTP,
    verifyOTP
} from '../lib/authOTP'
import { successResponse } from '../responses/success'
import type { ChangeEmailType } from '../schemas/auth/changeEmailSchema'
import { changeEmailSchema } from '../schemas/auth/changeEmailSchema'
import type { ConfirmEmailChangeType } from '../schemas/auth/confirmEmailChangeSchema'
import { confirmEmailChangeSchema } from '../schemas/auth/confirmEmailChangeSchema'
import type { ConfirmEmailType } from '../schemas/auth/confirmEmailSchema'
import { confirmEmailSchema } from '../schemas/auth/confirmEmailSchema'
import type { ForgotPasswordType } from '../schemas/auth/forgotPasswordSchema'
import { forgotPasswordSchema } from '../schemas/auth/forgotPasswordSchema'
import type { LoginType } from '../schemas/auth/loginSchema'
import { loginSchema } from '../schemas/auth/loginSchema'
import type { ResetPasswordType } from '../schemas/auth/resetPasswordSchema'
import { resetPasswordSchema } from '../schemas/auth/resetPasswordSchema'
import type { SignupType } from '../schemas/auth/signupSchema'
import { signupSchema } from '../schemas/auth/signupSchema'
import type { VerifyResetCodeType } from '../schemas/auth/verifyResetCodeSchema'
import { verifyResetCodeSchema } from '../schemas/auth/verifyResetCodeSchema'
import * as authServices from '../services/authService'
import * as googleOAuthService from '../services/googleOAuthService'
import type {
    ServerUserType,
    UserType
} from '../types/data/UserType'
import { validateAndExtract } from '../utils/controllerHelpers'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

// region Login and Signup
export const login = async (
    req: Request,
    res: Response
) => {
    const {
        email,
        password,
        remember
    } = validateAndExtract<LoginType>(
        loginSchema,
        req.body
    )

    const token = await authServices.login(
        email,
        password,
        remember,
        req.ip
    )
    const {
        csrfSecret,
        csrfToken: _csrf
    } = generateCSRFToken()

    const cookiesOptions = getCookiesOptions(remember)

    res.cookie(
        'accessToken',
        token,
        cookiesOptions
    )
    res.cookie(
        '_csrf',
        csrfSecret,
        {
            ...cookiesOptions,
            maxAge: hourInMs
        }
    )

    successResponse<{
        _csrf: string
    }>(
        res,
        { _csrf },
        'user logged in!'
    )
}

export const signup = async (
    req: Request,
    res: Response
) => {
    const userData = validateAndExtract<SignupType>(
        signupSchema,
        req.body
    )

    const newUserCreated: ServerUserType =
        await authServices.signup({
            ...userData,
            username:
                userData.username
                || generateRandomUsername()
        })

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(newUserCreated) },
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
    const { userId } = req

    const user: ServerUserType | null =
        userId
            ? await authServices.getUser('id', userId)
            : null

    if (!user)
        throw errorFactory.auth.unauthorized()

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(user) },
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
        { _csrf },
        'CSRF token generated!'
    )
}
// endregion

// region Password Reset Flow
export const forgotPassword = async (
    req: Request,
    res: Response
) => {
    const { email } = validateAndExtract<ForgotPasswordType>(
        forgotPasswordSchema,
        req.body
    )

    const otpCode = await sendForgotPasswordOTP(email)

    const OTP = isDev ? otpCode : null

    successResponse(
        res,
        { OTP },
        'We have sent you an email with an OTP to reset your password! Please check your email.'
    )
}

export const confirmEmail = async (
    req: Request,
    res: Response
) => {
    const { OTP, email } = validateAndExtract<ConfirmEmailType>(
        confirmEmailSchema,
        req.body
    )

    const user: ServerUserType | null =
        await authServices.getUser(
            'email',
            email
        )

    // Same error as a wrong code, so this step can't probe for accounts
    if (!user)
        throw errorFactory.validation.otpError()

    if (
        !verifyOTP(
            user.confirmEmailOTP!,
            user.confirmEmailExpiration!,
            OTP
        )
    ) {
        await recordFailedConfirmEmailAttempt(
            user.id,
            user.confirmEmailAttempts
        )
        throw errorFactory.validation.otpError()
    }

    await removeConfirmEmailOTP(user.id)

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(user) },
        'Your email is confirmed!',
        HttpStatusCodes.CREATED
    )
}

// Step 2 of the reset flow: checks the code without consuming it, so the
// client can confirm it before asking for a new password
export const verifyResetCode = async (
    req: Request,
    res: Response
) => {
    const { email, userOTP } = validateAndExtract<VerifyResetCodeType>(
        verifyResetCodeSchema,
        req.body
    )

    const user: ServerUserType | null =
        await authServices.getUser(
            'email',
            email
        )

    // Same error as a wrong code, so this step can't probe for accounts
    if (!user)
        throw errorFactory.auth.resetPassword()

    await assertResetPasswordOTP(user, userOTP)

    successResponse(
        res,
        {},
        'Code verified'
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
    } = validateAndExtract<ResetPasswordType>(
        resetPasswordSchema,
        req.body
    )

    const user: ServerUserType | null =
        await authServices.getUser(
            'email',
            email
        )

    // Same error as a wrong code, so this step can't probe for accounts
    if (!user)
        throw errorFactory.auth.resetPassword()

    await assertResetPasswordOTP(user, userOTP)

    const updatedUser =
        await authServices.resetPassword(
            user.id,
            newPassword
        )

    removeResetPasswordOTP(user.id).catch(
        (err) => {
            logger.error(
                'Failed to clear OTP',
                toLoggableError(err)
            )
        }
    )

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(updatedUser) },
        'Password has changed successfully!'
    )
}
// endregion

// region Change Email Flow
export const changeEmail = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const {
        newEmail,
        password
    } = validateAndExtract<ChangeEmailType>(
        changeEmailSchema,
        req.body
    )

    const user = await authServices.getUser('id', userId!)
    if (!user)
        throw errorFactory.auth.unauthorized()

    if (!await comparePassword(password, user.password))
        throw errorFactory.auth.credentials()

    if (await authServices.isEmailTaken(newEmail))
        throw errorFactory.auth.conflict(
            'Email already in use!'
        )

    const otpCode = await sendEmailChangeOTP(
        user.id,
        newEmail,
        user.profile?.language
    )

    const OTP = isDev ? otpCode : null

    successResponse(
        res,
        { OTP },
        'Verification code sent to your new email address!'
    )
}

export const confirmEmailChange = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { OTP } = validateAndExtract<ConfirmEmailChangeType>(
        confirmEmailChangeSchema,
        req.body
    )

    const user = await authServices.getUser('id', userId!)
    if (!user)
        throw errorFactory.auth.unauthorized()

    if (
        !user.emailChangeOTP
        || !user.emailChangeExpiration
        || !user.pendingEmail
    )
        throw errorFactory.validation.generic(
            'No pending email change request.'
        )

    if (
        !verifyOTP(
            user.emailChangeOTP,
            user.emailChangeExpiration,
            OTP
        )
    )
        throw errorFactory.validation.otpError()

    let updatedUser: ServerUserType
    try {
        updatedUser =
            await authServices.updateEmail(
                user.id,
                user.pendingEmail
            )
    } catch (err: unknown) {
        const isPrismaUniqueViolation =
            err instanceof Error
            && 'code' in err
            && (err as { code: string }).code === 'P2002'
        if (isPrismaUniqueViolation)
            throw errorFactory.auth.conflict(
                'This email address has been taken. Please start the process again.'
            )
        throw err
    }

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(updatedUser) },
        'Email updated successfully!'
    )
}
// endregion

// region Google OAuth
export const googleSignIn = async (
    req: Request,
    res: Response
) => {
    const state = crypto
        .randomBytes(32)
        .toString('hex')

    const redirect =
        typeof req.query.redirect === 'string'
            ? req.query.redirect
            : null

    const oauthCookieOptions = {
        httpOnly: true,
        sameSite: !isDev ? 'none' as const : 'lax' as const,
        secure: !isDev,
        maxAge: 10 * minuteInMs
    }

    res.cookie('oauth_state', state, oauthCookieOptions)

    if (redirect)
        res.cookie(
            'oauth_redirect',
            redirect,
            oauthCookieOptions
        )

    const authUrl =
        googleOAuthService.buildAuthUrl(state)

    res.redirect(authUrl)
}

export const googleCallback = async (
    req: Request,
    res: Response
) => {
    const { code, state } = req.query
    const storedState = req.cookies?.oauth_state

    const storedRedirect = req.cookies?.oauth_redirect
    res.clearCookie('oauth_state')
    res.clearCookie('oauth_redirect')

    if (
        !state
        || !storedState
        || state !== storedState
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
            code,
            req.ip
        )

    const token = createToken(user)
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

    const isValidRedirect =
        typeof storedRedirect === 'string'
        && storedRedirect.startsWith('/')
        && !storedRedirect.startsWith('//')

    const redirectPath = isValidRedirect
        ? storedRedirect
        : '/dashboard'

    res.redirect(`${googleOAuthConfig.clientUrl}${redirectPath}`)
}
// endregion
