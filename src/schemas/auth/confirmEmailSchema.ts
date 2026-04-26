import { z } from 'zod'

export const confirmEmailSchema = z.object({
    email: z.string().email(),
    OTP: z.number()
})
