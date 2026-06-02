import type {
    Profile,
    ProfileActivityPreference
} from '../../prisma/generated/prisma/client'
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
    activityPreferenceId: string
): Promise<ProfileActivityPreference> => {
    return Prisma.profileActivityPreference.upsert({
        where: {
            profileId_activityPreferenceId: {
                profileId,
                activityPreferenceId
            }
        },
        update: {},
        create: {
            profileId,
            activityPreferenceId
        }
    })
}

export const removeActivityPreference = async (
    profileId: string,
    activityPreferenceId: string
): Promise<void> => {
    await Prisma.profileActivityPreference.deleteMany({
        where: {
            profileId,
            activityPreferenceId
        }
    })
}

export const getActivityPreferences = async (
    profileId: string
) => {
    return Prisma.profileActivityPreference.findMany(
        {
            where: { profileId },
            include: { activityPreference: true },
            orderBy: { addedAt: 'desc' }
        }
    )
}

export const getAvailableHealthInterests = () =>
    [...VALID_HEALTH_INTEREST_SLUGS]

export const getAvailableActivityPreferences = async () => {
    return Prisma.activityPreference.findMany({
        where: { isActive: true },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' }
        ]
    })
}

export const getActivityPreferenceBySlug = async (slug: string) => {
    return Prisma.activityPreference.findUnique({
        where: { slug }
    })
}
