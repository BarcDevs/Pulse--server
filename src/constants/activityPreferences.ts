export const VALID_ACTIVITY_PREFERENCE_SLUGS = [
    'walking',
    'exercise',
    'stretching',
    'therapy',
    'work',
    'study',
    'household',
    'socializing',
    'rest',
    'hobbies',
    'outdoors',
    'mindfulness',
    'self_care',
    'medical'
] as const

export type ActivityPreferenceSlug
    = typeof VALID_ACTIVITY_PREFERENCE_SLUGS[number]
