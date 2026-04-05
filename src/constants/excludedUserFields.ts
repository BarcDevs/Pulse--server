import type {ServerUserType} from '../types/data/UserType'

export const excludedUserFields: (keyof ServerUserType)[] = [
    'password',
    'resetPasswordOTP',
    'resetPasswordExpiration',
    'passwordUpdatedAt',
    'createdAt',
    'active',
    'deletedAt',
]
