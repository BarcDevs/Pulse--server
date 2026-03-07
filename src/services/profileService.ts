import {errorFactory} from '../errors/factory'
import * as profileModel from '../models/ProfileModel'

type UpdateProfileData = {
    image?: string | null
    bio?: string | null
    location?: string | null
    timezone?: string | null
}

export const getProfile = async (
    userId: string
) => {
    const profile =
        await profileModel.getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    const healthInterestLinks =
        await profileModel.getHealthInterests(
            profile.id
        )
    const activityPrefLinks =
        await profileModel.getActivityPreferences(
            profile.id
        )

    return {
        ...profile,
        healthInterests: healthInterestLinks
            .map((hi) => hi.healthInterest)
            .filter(
                (hi) => hi !== undefined
            ),
        activityPreferences:
            activityPrefLinks
                .map((ap) => ap.activityPreference)
                .filter(
                    (ap) => ap !== undefined
                )
    }
}

export const updateProfile = async (
    userId: string,
    data: UpdateProfileData
) => {
    return await profileModel.updateProfile(
        userId,
        data
    )
}

export const addHealthInterests = async (
    userId: string,
    slugs: string[]
) => {
    const profile =
        await profileModel
            .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    const results = []

    for (const slug of slugs) {
        const interest =
            await profileModel
                .getHealthInterestBySlug(
                    slug
                )

        if (!interest) {
            throw errorFactory.generic.notFound(
                'Health interest'
            )
        }

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
    const profile =
        await profileModel
            .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    const interest =
        await profileModel
            .getHealthInterestBySlug(
                slug
            )

    if (!interest) {
        throw errorFactory.generic.notFound(
            'Health interest'
        )
    }

    await profileModel
        .removeHealthInterest(
            profile.id,
            interest.id
        )
}

export const addActivityPreferences = async (
    userId: string,
    slugs: string[]
) => {
    const profile =
        await profileModel
            .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    const results = []

    for (const slug of slugs) {
        const activity =
            await profileModel
                .getActivityPreferenceBySlug(
                    slug
                )

        if (!activity) {
            throw errorFactory.generic.notFound(
                'Activity preference'
            )
        }

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
    const profile =
        await profileModel
            .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    const activity =
        await profileModel
            .getActivityPreferenceBySlug(
                slug
            )

    if (!activity) {
        throw errorFactory.generic.notFound(
            'Activity preference'
        )
    }

    await profileModel
        .removeActivityPreference(
            profile.id,
            activity.id
        )
}

export const getAvailableHealthInterests =
    async () => {
        return await profileModel
            .getAvailableHealthInterests()
    }

export const getAvailableActivityPreferences =
    async () => {
        return await profileModel
            .getAvailableActivityPreferences()
    }
