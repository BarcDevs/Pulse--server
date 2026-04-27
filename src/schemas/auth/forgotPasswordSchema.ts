import { z } from 'zod'

export const forgotPasswordSchema = z.object({
    email: z.string()
        .email()
        .describe('Email is required')
})
