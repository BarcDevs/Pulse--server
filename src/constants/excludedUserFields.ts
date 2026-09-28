import type { ServerUserType } from '../types/data/UserType'

export const excludedUserFields: (keyof ServerUserType)[] = [
    'password',
    'resetPasswordOTP',
    'resetPasswordExpiration',
    'resetPasswordAttempts',
    'passwordUpdatedAt',
    'deletedAt',
    'confirmEmailOTP',
    'confirmEmailExpiration',
    'confirmEmailAttempts',
    'pendingEmail',
    'emailChangeOTP',
    'emailChangeExpiration',
    'googleId',
    'active'
]
