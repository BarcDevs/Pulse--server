import { z } from 'zod'

export const confirmEmailSchema = z.object({
    email: z.string()
        .email()
        .describe('Email is required'),
    OTP: z.number()
        .describe('OTP is required')
})
