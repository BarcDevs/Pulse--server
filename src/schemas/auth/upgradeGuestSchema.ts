import { signupSchema } from './signupSchema'

// A guest has no name or username, so only email and password are required
export const upgradeGuestSchema = signupSchema.partial({
    firstName: true,
    lastName: true
})

export type UpgradeGuestType = typeof upgradeGuestSchema._output
