import { z } from 'zod'

export const confirmEmailSchema = z.object({
    email: z.string('Email is required')
        .email(),
    OTP: z.number('OTP is required')
})
