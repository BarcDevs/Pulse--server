import { randomInt } from 'crypto'
import ms from 'ms'

import { authConfig } from '../../config'
import { getMessages } from '../locales'
import * as authModel from '../models/authModel'
import { sendEmail } from '../utils/emailSender'
import { t } from '../utils/i18n'

export const generateResetPasswordOTP = (): {
    OTP: number
    OTPExpiration: Date
} => {
    const OTP = randomInt(100000, 1000000)
    const OTPExpiration = new Date(
        Date.now() + ms(authConfig.otp_expiration)
    )

    return { OTP, OTPExpiration }
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

export const verifyResetPasswordOTP = (
    resetPasswordOTP: number,
    resetPasswordExpiration: Date,
    OTP: number
): boolean => {
    const now = new Date()
    return (
        now < resetPasswordExpiration
        && resetPasswordOTP === +OTP
    )
}

export const sendForgotPasswordOTP = async (
    email: string
): Promise<boolean | number> => {
    const user =
        await authModel.getUserByEmail(email)

    if (!user) return false

    const { OTP, OTPExpiration } =
        generateResetPasswordOTP()

    await authModel.setUserOTP(
        user.id,
        {
            resetPasswordOTP: OTP,
            resetPasswordExpiration: OTPExpiration
        }
    )

    const msgs = getMessages(user.profile?.language)
        .emails.resetPassword
    await sendEmail(
        email,
        msgs.subject,
        t(msgs.body, {
            otp: OTP
        })
    )

    return OTP
}

export const sendConfirmEmailOTP = async (
    email: string
): Promise<boolean | number> => {
    const user =
        await authModel.getUserByEmail(email)

    if (!user) return false

    const { OTP, OTPExpiration } =
        generateResetPasswordOTP()

    await authModel.setUserOTP(
        user.id,
        {
            resetPasswordOTP: OTP,
            resetPasswordExpiration: OTPExpiration
        }
    )

    const msgs = getMessages(user.profile?.language)
        .emails.confirmEmail
    await sendEmail(
        email,
        msgs.subject,
        t(msgs.body, {
            otp: OTP
        })
    )

    return OTP
}