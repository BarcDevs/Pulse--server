import {
    ensureProfileExists,
    resolveActivityPreferenceSlug,
    resolveHealthInterestSlug,
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
        healthInterestLinks,
        activityPrefLinks,
        interactions
    ] = await Promise.all([
        profileModel.getHealthInterests(profile.id),
        profileModel.getActivityPreferences(profile.id),
        forumModel.getProfileInteractions(
            profile.id,
            includePosts
        )
    ])

    const profileWithLinks = {
        ...profile,
        healthInterests: healthInterestLinks,
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

    const results = []

    for (const slug of slugs) {
        const interest =
            await resolveHealthInterestSlug(slug)

        const added =
            await profileModel
                .addHealthInterest(
                    profile.id,
                    interest.id
                )
        results.push(added)
    }

    return results
}

export const removeHealthInterest = async (
    userId: string,
    slug: string
) => {
    const profile = await ensureProfileExists(
        userId
    )

    const interest =
        await resolveHealthInterestSlug(slug)

    await profileModel
        .removeHealthInterest(
            profile.id,
            interest.id
        )
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
export const getAvailableHealthInterests =
    async () =>
        profileModel.getAvailableHealthInterests()

export const getAvailableActivityPreferences =
    async () =>
        profileModel.getAvailableActivityPreferences()
// endregion