import crypto from 'crypto'
import type { Request, Response } from 'express'

import {
    googleOAuthConfig,
    isDev
} from '../../config'
import { GUEST_ONLY_UPGRADE_MESSAGE } from '../constants/auth/authRules'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { minuteInMs } from '../constants/time'
import { errorFactory } from '../errors/factory/ErrorFactory'
import {
    comparePassword,
    createToken
} from '../lib/authCrypto'
import {
    generateRandomUsername,
    sanitizeUserData,
    setCsrfCookie,
    setSessionCookies
} from '../lib/authHelpers'
import {
    assertResetPasswordOTP,
    completeEmailConfirmation,
    recordFailedConfirmEmailAttempt,
    recordFailedEmailChangeAttempt,
    removeResetPasswordOTP,
    sendEmailChangeOTP,
    sendForgotPasswordOTP,
    verifyOTP
} from '../lib/authOTP'
import {
    trackLaunchGuest,
    trackLaunchRegistration
} from '../lib/launchFunnelTracking'
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
import type { UpgradeGuestType } from '../schemas/auth/upgradeGuestSchema'
import { upgradeGuestSchema } from '../schemas/auth/upgradeGuestSchema'
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

const newGoogleUserWindowMs = minuteInMs

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
    const _csrf = setSessionCookies(
        res,
        token,
        remember
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

    await trackLaunchRegistration(req, res)

    successResponse<{
        user: UserType
    }>(
        res,
        { user: sanitizeUserData(newUserCreated) },
        'user created!',
        HttpStatusCodes.CREATED
    )
}

// A guest has no password to log back in with, so a new session has to
// outlive the browser session
const respondWithSession = (
    res: Response,
    user: ServerUserType,
    message: string,
    status: number = HttpStatusCodes.OK,
    reissueToken = true
) => {
    const _csrf = reissueToken
        ? setSessionCookies(
            res,
            createToken(user, true),
            true
        )
        : setCsrfCookie(
            res,
            false
        )

    successResponse<{
        user: UserType
        _csrf: string
    }>(
        res,
        {
            user: sanitizeUserData(user),
            _csrf
        },
        message,
        status
    )
}

export const createGuest = async (
    req: Request,
    res: Response
) => {
    const {
        user,
        created
    } = await authServices.resolveGuest(
        req.cookies.accessToken,
        req.ip
    )

    if (created)
        await trackLaunchGuest(req)

    // A reused guest keeps its token: re-issuing it on every visit would keep
    // an abandoned guest alive past the retention window
    respondWithSession(
        res,
        user,
        created
            ? 'guest created!'
            : 'guest session!',
        created
            ? HttpStatusCodes.CREATED
            : HttpStatusCodes.OK,
        created
    )
}

export const upgradeGuest = async (
    req: Request,
    res: Response
) => {
    if (!req.isGuest || !req.userId)
        throw errorFactory.auth.forbidden(
            GUEST_ONLY_UPGRADE_MESSAGE
        )

    const upgrade = validateAndExtract<UpgradeGuestType>(
        upgradeGuestSchema,
        req.body
    )

    const user = await authServices.upgradeGuest(
        req.userId,
        upgrade
    )

    await trackLaunchRegistration(req, res)

    respondWithSession(
        res,
        user,
        'guest upgraded!'
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
    const _csrf = setCsrfCookie(
        res,
        false
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

    await completeEmailConfirmation(user.id)

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
    ) {
        await recordFailedEmailChangeAttempt(
            user.id,
            user.emailChangeAttempts
        )
        throw errorFactory.validation.otpError()
    }

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
        // Lax still sends these on Google's top-level redirect back
        sameSite: 'lax' as const,
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

    // Google sign-in creates and logs in through one path, so a user made
    // moments ago is the registration
    if (Date.now() - user.createdAt.getTime() < newGoogleUserWindowMs)
        await trackLaunchRegistration(req, res)

    setSessionCookies(
        res,
        createToken(user),
        false
    )

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
