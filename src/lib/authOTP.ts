import { randomInt } from 'crypto'
import ms from 'ms'

import { authConfig } from '../../config'
import { brandConfig } from '../config/app'
import {
    MAX_CONFIRM_EMAIL_ATTEMPTS,
    MAX_RESET_PASSWORD_ATTEMPTS
} from '../constants/auth/authRules'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { getMessages } from '../locales'
import * as authModel from '../models/authModel'
import type { ServerUserType } from '../types/data/UserType'
import { sendEmail } from '../utils/emailSender'
import {
    changeEmailTemplate,
    confirmEmailTemplate,
    resetPasswordTemplate
} from '../utils/emailTemplates'
import { t } from '../utils/i18n'

export const generateOTP = (): {
    otp: number
    expiration: Date
} => {
    const otp = randomInt(100000, 1000000)
    const expiration = new Date(
        Date.now() + ms(authConfig.otp_expiration)
    )

    return { otp, expiration }
}

export const verifyOTP = (
    stored: number,
    expiration: Date,
    input: number
): boolean => {
    const now = new Date()
    return (
        now < expiration
        && stored === +input
    )
}

export const removeResetPasswordOTP = async (
    userId: string
): Promise<void> => {
    await authModel.setUserOTP(
        userId,
        {
            resetPasswordOTP: null,
            resetPasswordExpiration: null,
            resetPasswordAttempts: 0
        }
    )
}

export const recordFailedResetPasswordAttempt = async (
    userId: string,
    currentAttempts: number
): Promise<void> => {
    if (currentAttempts + 1 >= MAX_RESET_PASSWORD_ATTEMPTS) {
        await removeResetPasswordOTP(userId)
        return
    }

    await authModel.incrementResetPasswordAttempts(userId)
}

// Shared by the verify-code step and the reset itself, so both count
// failed attempts toward the same limit
export const assertResetPasswordOTP = async (
    user: ServerUserType,
    userOTP: number
): Promise<void> => {
    if (
        verifyOTP(
            user.resetPasswordOTP!,
            user.resetPasswordExpiration!,
            userOTP
        )
    ) return

    await recordFailedResetPasswordAttempt(
        user.id,
        user.resetPasswordAttempts
    )
    throw errorFactory.auth.resetPassword()
}

export const removeConfirmEmailOTP = async (
    userId: string
): Promise<void> => {
    await authModel.setConfirmEmailOTP(
        userId,
        {
            confirmEmailOTP: null,
            confirmEmailExpiration: null,
            confirmEmailAttempts: 0
        }
    )

    await authModel.markEmailVerified(userId)
}

export const recordFailedConfirmEmailAttempt = async (
    userId: string,
    currentAttempts: number
): Promise<void> => {
    if (currentAttempts + 1 >= MAX_CONFIRM_EMAIL_ATTEMPTS) {
        await removeConfirmEmailOTP(userId)
        return
    }

    await authModel.incrementConfirmEmailAttempts(userId)
}

export const removeEmailChangeOTP = async (
    userId: string
): Promise<void> => {
    await authModel.setEmailChangeOTP(
        userId,
        {
            pendingEmail: null,
            emailChangeOTP: null,
            emailChangeExpiration: null
        }
    )
}

export const sendForgotPasswordOTP = async (
    email: string
): Promise<boolean | number> => {
    const user =
        await authModel.getUserByEmail(email)

    if (!user) return false

    const { otp, expiration } = generateOTP()

    await authModel.setUserOTP(
        user.id,
        {
            resetPasswordOTP: otp,
            resetPasswordExpiration: expiration,
            resetPasswordAttempts: 0
        }
    )

    const lang = user.profile?.language
    const messages = getMessages(lang).emails.resetPassword
    await sendEmail(
        email,
        t(messages.subject, { brandName: brandConfig.brandName }),
        t(messages.body, { otp, brandName: brandConfig.brandName }),
        resetPasswordTemplate(otp, lang)
    )

    return otp
}

export const sendConfirmEmailOTP = async (
    email: string
): Promise<boolean | number> => {
    const user =
        await authModel.getUserByEmail(email)

    if (!user) return false

    const { otp, expiration } = generateOTP()

    await authModel.setConfirmEmailOTP(
        user.id,
        {
            confirmEmailOTP: otp,
            confirmEmailExpiration: expiration,
            confirmEmailAttempts: 0
        }
    )

    const lang = user.profile?.language
    const messages = getMessages(lang).emails.confirmEmail
    await sendEmail(
        email,
        t(messages.subject, { brandName: brandConfig.brandName }),
        t(messages.body, { otp, brandName: brandConfig.brandName }),
        confirmEmailTemplate(otp, lang)
    )

    return otp
}

export const sendEmailChangeOTP = async (
    userId: string,
    newEmail: string,
    language?: string | null
): Promise<number> => {
    const { otp, expiration } = generateOTP()

    await authModel.setEmailChangeOTP(userId, {
        pendingEmail: newEmail,
        emailChangeOTP: otp,
        emailChangeExpiration: expiration
    })

    const messages = getMessages(language).emails.changeEmail
    await sendEmail(
        newEmail,
        t(messages.subject, { brandName: brandConfig.brandName }),
        t(messages.body, { otp, brandName: brandConfig.brandName }),
        changeEmailTemplate(otp, language)
    )

    return otp
}
