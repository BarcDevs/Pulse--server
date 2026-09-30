import { z } from 'zod'

export const forgotPasswordSchema = z.object({
    email: z.email('Email is required').toLowerCase()
})

export type ForgotPasswordType
    = z.infer<typeof forgotPasswordSchema>
