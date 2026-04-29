import { z } from 'zod'

export const forgotPasswordSchema = z.object({
    email: z.string('Email is required')
        .email()
})
