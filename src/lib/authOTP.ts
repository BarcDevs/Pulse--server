import { randomInt } from 'crypto'
import ms from 'ms'

import { authConfig } from '../../config'
import * as authModel from '../models/authModel'
import { sendEmail } from '../utils/emailSender'

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

    await sendEmail(
        email,
        'Reset Your Password',
        `Your OTP to reset your password is: ${OTP}`
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

    await sendEmail(
        email,
        'Confirm Email',
        `Your OTP to confirm your email is: ${OTP}`
    )

    return OTP
}