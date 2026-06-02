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
    'self-care',
    'medical',
    'meditation',
    'yoga'
] as const

export type ActivityPreferenceSlug
    = typeof VALID_ACTIVITY_PREFERENCE_SLUGS[number]
