import {errorFactory} from '../errors/factory'
import * as profileModel from '../models/ProfileModel'

const ensureProfileExists = async (
    userId: string
) => {
    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    return profile
}

const resolveHealthInterestSlug = async (
    slug: string
) => {
    const interest = await profileModel
        .getHealthInterestBySlug(slug)

    if (!interest) {
        throw errorFactory.generic.notFound(
            'Health interest'
        )
    }

    return interest
}

const resolveActivityPreferenceSlug = async (
    slug: string
) => {
    const activity = await profileModel
        .getActivityPreferenceBySlug(slug)

    if (!activity) {
        throw errorFactory.generic.notFound(
            'Activity preference'
        )
    }

    return activity
}

const transformProfileWithInterests = (profile: any) => {
    const healthInterestLinks =
        profile.healthInterests || []
    const activityPrefLinks =
        profile.activityPreferences || []

    return {
        ...profile,
        healthInterests: healthInterestLinks
            .map((hi: any) => hi.healthInterest)
            .filter((hi: any) => hi !== undefined),
        activityPreferences: activityPrefLinks
            .map((ap: any) => ap.activityPreference)
            .filter((ap: any) => ap !== undefined)
    }
}

export {
    ensureProfileExists,
    resolveActivityPreferenceSlug,
    resolveHealthInterestSlug,
    transformProfileWithInterests
}