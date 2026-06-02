import { errorFactory } from '../errors/factory/ErrorFactory'
import * as profileModel from '../models/profileModel'
import type {
    ActivityPreferenceType,
    ProfileActivityPreferenceType,
    ProfileType
} from '../types/data/UserType'

export const ensureProfileExists = async (
    userId: string
) => {
    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    return profile
}

export const resolveActivityPreferenceSlug = async (
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

export const transformProfileWithInterests = (
    profile: ProfileType
): Omit<ProfileType, 'activityPreferences'> & {
    activityPreferences: ActivityPreferenceType[]
} => {
    return {
        ...profile,
        activityPreferences: (
            profile.activityPreferences || []
        )
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
