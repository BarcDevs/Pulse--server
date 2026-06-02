import type { Profile } from '../../prisma/generated/prisma/client'
import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../constants/activityPreferences'
import { VALID_HEALTH_INTEREST_SLUGS } from '../constants/healthInterests'
import Prisma from '../utils/prismaClient'

type ProfileData = Partial<
    Pick<
        Profile,
        'image' | 'bio' | 'location' | 'timezone'
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

export const addHealthInterest = async (
    profileId: string,
    slug: string
): Promise<void> => {
    const profile = await Prisma.profile.findUnique({
        where: { id: profileId },
        select: { healthInterests: true }
    })
    if (!profile || profile.healthInterests.includes(slug)) return
    await Prisma.profile.update({
        where: { id: profileId },
        data: { healthInterests: { push: slug } }
    })
}

export const removeHealthInterest = async (
    profileId: string,
    slug: string
): Promise<void> => {
    const profile = await Prisma.profile.findUnique({
        where: { id: profileId },
        select: { healthInterests: true }
    })
    if (!profile) return
    await Prisma.profile.update({
        where: { id: profileId },
        data: {
            healthInterests: {
                set: profile.healthInterests.filter(
                    s => s !== slug
                )
            }
        }
    })
}

export const addActivityPreference = async (
    profileId: string,
    slug: string
): Promise<void> => {
    const profile = await Prisma.profile.findUnique({
        where: { id: profileId },
        select: { activityPreferences: true }
    })
    if (!profile || profile.activityPreferences.includes(slug)) return
    await Prisma.profile.update({
        where: { id: profileId },
        data: { activityPreferences: { push: slug } }
    })
}

export const removeActivityPreference = async (
    profileId: string,
    slug: string
): Promise<void> => {
    const profile = await Prisma.profile.findUnique({
        where: { id: profileId },
        select: { activityPreferences: true }
    })
    if (!profile) return
    await Prisma.profile.update({
        where: { id: profileId },
        data: {
            activityPreferences: {
                set: profile.activityPreferences.filter(
                    s => s !== slug
                )
            }
        }
    })
}

export const getAvailableHealthInterests = () =>
    [...VALID_HEALTH_INTEREST_SLUGS]

export const getAvailableActivityPreferences = () =>
    [...VALID_ACTIVITY_PREFERENCE_SLUGS]
