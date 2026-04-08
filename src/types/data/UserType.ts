import type {Role} from '../../../prisma/generated/prisma/enums'
import type {Prettify} from '../index'

import type {PostType} from './PostType'
import type {ReplyType} from './ReplyType'
import type {TagType} from './TagType'

export type HealthInterestType = {
    id: string
    slug: string
    name: string
    description?: string | null
    category?: string | null
    sortOrder?: number | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export type ActivityPreferenceType = {
    id: string
    slug: string
    name: string
    description?: string | null
    category?: string | null
    sortOrder?: number | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export type ProfileHealthInterestType = {
    id: string
    profileId: string
    healthInterestId: string
    healthInterest?: HealthInterestType
    addedAt: Date
}

export type ProfileActivityPreferenceType = {
    id: string
    profileId: string
    activityPreferenceId: string
    activityPreference?: ActivityPreferenceType
    addedAt: Date
}

export type ProfileType = {
    id: string
    userId: string
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone?: string | null
    dateFormat?: string | null
    theme: string
    language: string
    dailyReminder: boolean
    communityAlerts: boolean
    profileVisibility: string
    anonymousParticipation: boolean
    healthInterests?: ProfileHealthInterestType[]
    activityPreferences?: ProfileActivityPreferenceType[]
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
    profile?: Partial<ProfileType>
    posts?: PostType[]
    replies?: ReplyType[]
    followedTags?: Partial<TagType>[]
}

export type ServerUserType = Prettify<
    UserType & {
        password: string
        resetPasswordOTP?: number
        resetPasswordExpiration?: Date
        passwordUpdatedAt: Date
        createdAt: Date
        active: boolean
        deletedAt?: Date
    }
>

export type NewUserType = {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
}
