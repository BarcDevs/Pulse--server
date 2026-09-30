import type {
    ProfileTheme,
    ProfileVisibility
} from '../../prisma/generated/prisma/enums'
import { ensureProfileExists } from '../lib/profileHelpers'
import * as forumModel from '../models/forumModel'
import * as profileModel from '../models/profileModel'

type UpdateProfileData = {
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone?: string
    theme?: ProfileTheme
    language?: string
    dailyReminder?: boolean
    communityAlerts?: boolean
    profileVisibility?: ProfileVisibility
    anonymousParticipation?: boolean
    shareNotesWithAI?: boolean
    dateOfBirth?: string
    recoveryType?: string
    careProvider?: string
    healthInterests?: string[]
    activityPreferences?: string[]
}

// region Profile CRUD
export const getProfile = async (
    userId: string,
    includePosts = false
) => {
    const profile = await ensureProfileExists(userId)
    const interactions = await forumModel
        .getProfileInteractions(profile.id, includePosts)
    return { ...profile, ...interactions }
}

export const updateProfile = async (
    userId: string,
    data: UpdateProfileData
) => {
    const { dateOfBirth, ...rest } = data
    return profileModel.updateProfile(userId, {
        ...rest,
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) })
    })
}
// endregion

// region Available Options
export const getAvailableHealthInterests = () =>
    profileModel.getAvailableHealthInterests()

export const getAvailableActivityPreferences = () =>
    profileModel.getAvailableActivityPreferences()
// endregion