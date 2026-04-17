import ms from 'ms'

import { authConfig } from '../../config'
import * as authModel from '../models/authModel'
import { sendEmail } from '../utils/emailSender'

export const generateResetPasswordOTP = (): {
    OTP: number
    OTPExpiration: Date
} => {
    const OTP = Math.floor(
        100000 + Math.random() * 900000
    )
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
            resetPasswordExpiration: null,
            passwordUpdatedAt: new Date(
                Date.now()
            )
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

export const sendEmailWithOTP = async (
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

    sendEmail(
        email,
        'Confirm Email',
        `here is your OTP for confirm email: ${OTP}`
    )

    return OTP
}