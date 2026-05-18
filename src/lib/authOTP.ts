import { randomInt } from 'crypto'
import ms from 'ms'

import { authConfig } from '../../config'
import { getMessages } from '../locales'
import * as authModel from '../models/authModel'
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
            resetPasswordExpiration: null
        }
    )
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
            resetPasswordExpiration: expiration
        }
    )

    const lang = user.profile?.language
    const msgs = getMessages(lang).emails.resetPassword
    await sendEmail(
        email,
        msgs.subject,
        t(msgs.body, { otp }),
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

    await authModel.setUserOTP(
        user.id,
        {
            resetPasswordOTP: otp,
            resetPasswordExpiration: expiration
        }
    )

    const lang = user.profile?.language
    const msgs = getMessages(lang).emails.confirmEmail
    await sendEmail(
        email,
        msgs.subject,
        t(msgs.body, { otp }),
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

    const msgs = getMessages(language).emails.changeEmail
    await sendEmail(
        newEmail,
        msgs.subject,
        t(msgs.body, { otp }),
        changeEmailTemplate(otp, language)
    )

    return otp
}
