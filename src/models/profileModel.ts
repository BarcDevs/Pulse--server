import type { Profile } from '../../prisma/generated/prisma/client'
import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../constants/activityPreferences'
import { VALID_HEALTH_INTEREST_SLUGS } from '../constants/healthInterests'
import {
    PROFILE_CONTEXT_CACHE_KEY_PREFIX,
    PROFILE_CONTEXT_TTL_SECONDS
} from '../constants/profileContextCache'
import { cacheAside, invalidateCache } from '../lib/redis/cache'
import Prisma from '../utils/prismaClient'

type ProfileContext = {
    id: string
    timezone: string
}

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
): Promise<ProfileContext | null> =>
    cacheAside<ProfileContext>(
        `${PROFILE_CONTEXT_CACHE_KEY_PREFIX}${userId}`,
        PROFILE_CONTEXT_TTL_SECONDS,
        () => Prisma.profile.findUnique({
            where: { userId },
            select: { id: true, timezone: true }
        })
    )

export const updateProfile = async (
    userId: string,
    data: ProfileData
): Promise<Profile> => {
    const profile = await Prisma.profile.update({
        where: { userId },
        data
    })

    await invalidateCache(`${PROFILE_CONTEXT_CACHE_KEY_PREFIX}${userId}`)

    return profile
}

export const getAvailableHealthInterests = () =>
    [...VALID_HEALTH_INTEREST_SLUGS]

export const getAvailableActivityPreferences = () =>
    [...VALID_ACTIVITY_PREFERENCE_SLUGS]
