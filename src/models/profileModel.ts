import type { Profile } from '../../prisma/generated/prisma/client'
import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../constants/activityPreferences'
import { VALID_HEALTH_INTEREST_SLUGS } from '../constants/healthInterests'
import * as profileContextCache from '../lib/cache/profileContextCache'
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
        | 'shareNotesWithAI'
        | 'dateOfBirth'
        | 'recoveryType'
        | 'careProvider'
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

// Only the stable fields, read on almost every request. Never cache
// anonymousParticipation here: it changes with every post or reply choice.
export const findProfileContext = async (
    userId: string
): Promise<profileContextCache.ProfileContext | null> => {
    const cached = profileContextCache.get(userId)

    if (cached)
        return cached

    const profile = await Prisma.profile.findUnique({
        where: { userId },
        select: { id: true, timezone: true }
    })

    if (profile)
        profileContextCache.set(userId, profile)

    return profile
}

export const updateProfile = async (
    userId: string,
    data: ProfileData
): Promise<Profile> => {
    const profile = await Prisma.profile.update({
        where: { userId },
        data
    })

    profileContextCache.invalidate(userId)

    return profile
}

export const getAvailableHealthInterests = () =>
    [...VALID_HEALTH_INTEREST_SLUGS]

export const getAvailableActivityPreferences = () =>
    [...VALID_ACTIVITY_PREFERENCE_SLUGS]
