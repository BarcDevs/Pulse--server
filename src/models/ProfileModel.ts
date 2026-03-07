import type {
    Profile,
    ProfileActivityPreference,
    ProfileHealthInterest
} from '../../prisma/generated/prisma/client'
import Prisma from '../utils/PrismaClient'

type ProfileData = Partial<
    Pick<
        Profile,
        'image' | 'bio' | 'location' | 'timezone'
    >
>

export const getProfileByUserId = async (
    userId: string
): Promise<Profile | null> => {
    const profile = await Prisma.profile.findUnique({
        where: { userId }
    })
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
    return profile
}

export const addHealthInterest = async (
    profileId: string,
    healthInterestId: string
): Promise<ProfileHealthInterest> => {
    const interest = await Prisma.profileHealthInterest.upsert({
        where: {
            profileId_healthInterestId: {
                profileId,
                healthInterestId
            }
        },
        update: {},
        create: {
            profileId,
            healthInterestId
        }
    })
    return interest
}

export const removeHealthInterest = async (
    profileId: string,
    healthInterestId: string
): Promise<void> => {
    await Prisma.profileHealthInterest.deleteMany({
        where: {
            profileId,
            healthInterestId
        }
    })
}

export const getHealthInterests = async (
    profileId: string
) => {
    const interests =
        await Prisma.profileHealthInterest.findMany(
            {
                where: { profileId },
                include: { healthInterest: true },
                orderBy: { addedAt: 'desc' }
            }
        )
    return interests
}

export const addActivityPreference = async (
    profileId: string,
    activityPreferenceId: string
): Promise<ProfileActivityPreference> => {
    const activity = await Prisma.profileActivityPreference.upsert({
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
    return activity
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
    const activities =
        await Prisma.profileActivityPreference.findMany(
            {
                where: { profileId },
                include: { activityPreference: true },
                orderBy: { addedAt: 'desc' }
            }
        )
    return activities
}

export const getAvailableHealthInterests = async () => {
    const interests = await Prisma.healthInterest.findMany({
        where: { isActive: true },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' }
        ]
    })
    return interests
}

export const getAvailableActivityPreferences = async () => {
    const activities = await Prisma.activityPreference.findMany({
        where: { isActive: true },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' }
        ]
    })
    return activities
}

export const getHealthInterestBySlug = async (slug: string) => {
    const interest = await Prisma.healthInterest.findUnique({
        where: { slug }
    })
    return interest
}

export const getActivityPreferenceBySlug = async (slug: string) => {
    const activity = await Prisma.activityPreference.findUnique({
        where: { slug }
    })
    return activity
}