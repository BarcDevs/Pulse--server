import { z } from 'zod'

import { caseInsensitiveEnum } from './utils/caseInsensitiveEnum'

export const updateProfileSchema = z.object({
    image: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    timezone: z.string()
        .regex(/^([A-Z][A-Za-z]+\/[A-Za-z0-9_]+|UTC)$/)
        .optional(),
    theme: caseInsensitiveEnum([
        'light',
        'dark'
    ]).optional(),
    language: z.string().max(10).optional(),
    dailyReminder: z.boolean().optional(),
    communityAlerts: z.boolean().optional(),
    profileVisibility: caseInsensitiveEnum([
        'onlyMe',
        'friends',
        'public']
    ).optional(),
    anonymousParticipation: z.boolean().optional()
})

export const addHealthInterestsSchema = z.object({
    slugs: z.array(
        z.string().max(50)
    ).min(1, 'At least one health interest is required')
})

export const addActivityPreferencesSchema = z.object({
    slugs: z.array(
        z.string().max(50)
    ).min(1, 'At least one activity preference is required')
})

export const slugParamSchema = z.object({
    slug: z.string().max(50)
})