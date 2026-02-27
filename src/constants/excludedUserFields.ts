import type {ServerUserType} from '../types/data/UserType'

export const excludedUserFields: (keyof ServerUserType)[] = [
    'password',
    'resetPasswordOTP',
    'resetPasswordExpiration',
    'password_updated_at',
    'created_at',
    'active',
    'deleted_at',
]
