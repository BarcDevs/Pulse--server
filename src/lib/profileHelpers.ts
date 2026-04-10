import { errorFactory } from '../errors/factory'
import * as profileModel from '../models/ProfileModel'
import type {
    ActivityPreferenceType,
    HealthInterestType,
    ProfileActivityPreferenceType,
    ProfileHealthInterestType,
    ProfileType
} from '../types/data/UserType'

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

const transformProfileWithInterests = (
    profile: ProfileType
): Omit<
    ProfileType,
    'healthInterests' | 'activityPreferences'
> & {
    healthInterests: HealthInterestType[]
    activityPreferences: ActivityPreferenceType[]
} => {
    const healthInterestLinks =
        profile.healthInterests || []
    const activityPrefLinks =
        profile.activityPreferences || []

    return {
        ...profile,
        healthInterests: healthInterestLinks
            .map(
                (
                    hi: ProfileHealthInterestType
                ) => hi.healthInterest
            )
            .filter(
                (
                    hi: HealthInterestType | undefined
                ): hi is HealthInterestType =>
                    hi !== undefined
            ),
        activityPreferences: activityPrefLinks
            .map(
                (
                    ap: ProfileActivityPreferenceType
                ) => ap.activityPreference
            )
            .filter(
                (
                    ap: ActivityPreferenceType | undefined
                ): ap is ActivityPreferenceType =>
                    ap !== undefined
            )
    }
}

export {
    ensureProfileExists,
    resolveActivityPreferenceSlug,
    resolveHealthInterestSlug,
    transformProfileWithInterests
}