import type {
    ProfileTheme,
    ProfileVisibility,
    Role
} from '../../../prisma/generated/prisma/enums'
import type { Prettify } from '../index'

export type ProfileType = {
    id: string
    userId: string
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone: string
    dateFormat?: string | null
    theme: ProfileTheme
    language: string
    dailyReminder: boolean
    communityAlerts: boolean
    profileVisibility: ProfileVisibility
    anonymousParticipation: boolean
    shareNotesWithAI: boolean
    lastCheckInAt?: Date | null
    dateOfBirth?: Date
    recoveryType?: string
    careProvider?: string
    healthInterests: string[]
    activityPreferences: string[]
    createdAt: Date
    updatedAt: Date
}

export type UserType = {
    id: string
    firstName: string
    lastName: string
    username: string
    email: string
    googleId?: string | null
    role: Role
    createdAt: Date
    active: boolean
    profile?: Partial<ProfileType>
}

export type ServerUserType = Prettify<
    UserType & {
        password: string
        resetPasswordOTP?: number | null
        resetPasswordExpiration?: Date | null
        resetPasswordAttempts: number
        passwordUpdatedAt: Date
        deletedAt?: Date | null
        emailVerifiedAt?: Date | null
        confirmEmailOTP?: number | null
        confirmEmailExpiration?: Date | null
        confirmEmailAttempts: number
        pendingEmail?: string | null
        emailChangeOTP?: number | null
        emailChangeExpiration?: Date | null
        emailChangeAttempts: number
        deleteAccountOTP?: number | null
        deleteAccountExpiration?: Date | null
        deleteAccountAttempts: number
    }
>

export type NewUserType = {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
}
