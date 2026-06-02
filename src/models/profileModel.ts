import type {
    Profile,
    ProfileActivityPreference,
    ProfileHealthInterest
} from '../../prisma/generated/prisma/client'
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
    healthInterestId: string
): Promise<ProfileHealthInterest> => {
    return Prisma.profileHealthInterest.upsert({
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
    return Prisma.profileHealthInterest.findMany(
        {
            where: { profileId },
            include: { healthInterest: true },
            orderBy: { addedAt: 'desc' }
        }
    )
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

export const getAvailableHealthInterests = async () => {
    return Prisma.healthInterest.findMany({
        where: { isActive: true },
        orderBy: [
            { sortOrder: 'asc' },
            { slug: 'asc' }
        ]
    })
}

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

export const getHealthInterestBySlug = async (slug: string) => {
    return Prisma.healthInterest.findUnique({
        where: { slug }
    })
}

export const getActivityPreferenceBySlug = async (slug: string) => {
    return Prisma.activityPreference.findUnique({
        where: { slug }
    })
}
