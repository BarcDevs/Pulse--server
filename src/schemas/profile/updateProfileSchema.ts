import { z } from 'zod'

import { VALID_ACTIVITY_PREFERENCE_SLUGS } from '../../constants/activityPreferences'
import { VALID_HEALTH_INTEREST_SLUGS } from '../../constants/healthInterests'
import { caseInsensitiveEnum } from '../utils/caseInsensitiveEnum'

export const updateProfileSchema = z.object({
    // TODO: update when image upload endpoint is implemented (multipart)
    image: z.string()
        .url('Invalid image URL')
        .optional(),
    bio: z.string()
        .max(500, 'Bio must be 500 characters or fewer')
        .optional(),
    location: z.string()
        .max(100, 'Location must be 100 characters or fewer')
        .optional(),
    timezone: z.string()
        .regex(
            /^([A-Z][A-Za-z]+\/[A-Za-z0-9_]+|UTC)$/,
            'Invalid timezone. Use IANA format (e.g. America/New_York) or UTC'
        )
        .optional(),
    theme: caseInsensitiveEnum([
        'light',
        'dark'
    ]).optional(),
    language: z.string()
        .max(10)
        .optional(),
    dailyReminder: z.boolean().optional(),
    communityAlerts: z.boolean().optional(),
    profileVisibility: caseInsensitiveEnum([
        'onlyMe',
        'friends',
        'public'
    ]).optional(),
    anonymousParticipation: z.boolean().optional(),
    healthInterests: z.array(
        z.enum(VALID_HEALTH_INTEREST_SLUGS, {
            message: 'Invalid health interest slug'
        })
    ).optional(),
    activityPreferences: z.array(
        z.enum(VALID_ACTIVITY_PREFERENCE_SLUGS, {
            message: 'Invalid activity preference slug'
        })
    ).optional()
})
