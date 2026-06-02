import type { Profile } from '../../prisma/generated/prisma/client'
import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../constants/activityPreferences'
import { VALID_HEALTH_INTEREST_SLUGS } from '../constants/healthInterests'
import Prisma from '../utils/prismaClient'

type ProfileData = Partial<
    Pick<
        Profile,
        | 'image'
        | 'bio'
        | 'location'
        | 'timezone'
        | 'theme'
        | 'language'
        | 'dailyReminder'
        | 'communityAlerts'
        | 'profileVisibility'
        | 'anonymousParticipation'
        | 'healthInterests'
        | 'activityPreferences'
    >
>

export const getProfileByUserId = async (
    userId: string
): Promise<Profile | null> => {
    return Prisma.profile.findUnique({
        where: { userId }
    })
}

export const updateProfile = async (
    userId: string,
    data: ProfileData
): Promise<Profile> => {
    return Prisma.profile.update({
        where: { userId },
        data
    })
}

export const getAvailableHealthInterests = () =>
    [...VALID_HEALTH_INTEREST_SLUGS]

export const getAvailableActivityPreferences = () =>
    [...VALID_ACTIVITY_PREFERENCE_SLUGS]
