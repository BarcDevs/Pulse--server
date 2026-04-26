import { z } from 'zod'

export const updateProfileSchema = z.object({
    image: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    timezone: z.string().regex(/^([A-Z][A-Za-z]+\/[A-Za-z0-9_]+|UTC)$/).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    language: z.string().max(10).optional(),
    dailyReminder: z.boolean().optional(),
    communityAlerts: z.boolean().optional(),
    profileVisibility: z.enum(['onlyMe', 'friends', 'public']).optional(),
    anonymousParticipation: z.boolean().optional()
})

export const addHealthInterestsSchema = z.object({
    slugs: z.array(z.string().max(50))
})

export const addActivityPreferencesSchema = z.object({
    slugs: z.array(z.string().max(50))
})

export const slugParamSchema = z.object({
    slug: z.string().max(50)
})