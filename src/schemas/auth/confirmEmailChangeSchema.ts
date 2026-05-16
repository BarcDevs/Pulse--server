import { z } from 'zod'

export const confirmEmailChangeSchema = z.object({
    OTP: z.number('OTP is required')
})
