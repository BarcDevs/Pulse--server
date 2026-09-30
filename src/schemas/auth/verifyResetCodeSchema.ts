import { z } from 'zod'

export const verifyResetCodeSchema = z.object({
    email: z.email('Email is required').toLowerCase(),
    userOTP: z.number('OTP is required')
})

export type VerifyResetCodeType
    = z.infer<typeof verifyResetCodeSchema>
