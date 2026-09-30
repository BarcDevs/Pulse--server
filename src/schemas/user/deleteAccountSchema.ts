import { z } from 'zod'

export const deleteAccountSchema = z.object({
    OTP: z.number('OTP is required')
})

export type DeleteAccountType
    = z.infer<typeof deleteAccountSchema>
