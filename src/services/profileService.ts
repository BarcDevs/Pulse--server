import {
    ensureProfileExists,
    resolveActivityPreferenceSlug,
    transformProfileWithInterests
} from '../lib/profileHelpers'
import * as forumModel from '../models/forumModel'
import * as profileModel from '../models/profileModel'

type UpdateProfileData = {
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone?: string
    theme?: string
    language?: string
    dailyReminder?: boolean
    communityAlerts?: boolean
    profileVisibility?: string
    anonymousParticipation?: boolean
}

// region Profile CRUD
export const getProfile = async (
    userId: string,
    includePosts = false
) => {
    const profile = await ensureProfileExists(userId)

    const [
        activityPrefLinks,
        interactions
    ] = await Promise.all([
        profileModel.getActivityPreferences(profile.id),
        forumModel.getProfileInteractions(
            profile.id,
            includePosts
        )
    ])

    const profileWithLinks = {
        ...profile,
        activityPreferences: activityPrefLinks
    }

    return {
        ...transformProfileWithInterests(profileWithLinks),
        ...interactions
    }
}

export const updateProfile = async (
    userId: string,
    data: UpdateProfileData
) =>
    profileModel.updateProfile(
        userId,
        data
    )
// endregion

// region Health Interests
export const addHealthInterests = async (
    userId: string,
    slugs: string[]
) => {
    const profile = await ensureProfileExists(
        userId
    )

    await Promise.all(
        slugs.map(slug =>
            profileModel.addHealthInterest(profile.id, slug)
        )
    )
}

export const removeHealthInterest = async (
    userId: string,
    slug: string
) => {
    const profile = await ensureProfileExists(
        userId
    )

    await profileModel.removeHealthInterest(profile.id, slug)
}
// endregion

// region Activity Preferences
export const addActivityPreferences = async (
    userId: string,
    slugs: string[]
) => {
    const profile = await ensureProfileExists(
        userId
    )

    const results = []

    for (const slug of slugs) {
        const activity =
            await resolveActivityPreferenceSlug(slug)

        const added =
            await profileModel
                .addActivityPreference(
                    profile.id,
                    activity.id
                )
        results.push(added)
    }

    return results
}

export const removeActivityPreference = async (
    userId: string,
    slug: string
) => {
    const profile = await ensureProfileExists(
        userId
    )

    const activity =
        await resolveActivityPreferenceSlug(slug)

    await profileModel
        .removeActivityPreference(
            profile.id,
            activity.id
        )
}
// endregion

// region Available Options
export const getAvailableHealthInterests = () =>
    profileModel.getAvailableHealthInterests()

export const getAvailableActivityPreferences =
    async () =>
        profileModel.getAvailableActivityPreferences()
// endregion