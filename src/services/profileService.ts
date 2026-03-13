import * as profileModel from '../models/ProfileModel'
import {
    ensureProfileExists,
    resolveHealthInterestSlug,
    resolveActivityPreferenceSlug,
    transformProfileWithInterests
} from '../lib/profileHelpers'

type UpdateProfileData = {
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone?: string | null
}

// region Profile CRUD
export const getProfile = async (
    userId: string
) => {
    const profile = await ensureProfileExists(
        userId
    )

    const healthInterestLinks =
        await profileModel.getHealthInterests(
            profile.id
        )
    const activityPrefLinks =
        await profileModel.getActivityPreferences(
            profile.id
        )

    const profileWithLinks = {
        ...profile,
        healthInterests: healthInterestLinks,
        activityPreferences: activityPrefLinks
    }

    return transformProfileWithInterests(
        profileWithLinks
    )
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