export const VALID_ACTIVITY_PREFERENCE_SLUGS = [
    'meditation',
    'yoga',
    'walking',
    'swimming',
    'running',
    'cycling',
    'strength-training',
    'journaling',
    'breathing-exercises',
    'tai-chi',
    'pilates',
    'dancing',
    'reading',
    'cooking',
    'gardening'
] as const

export type ActivityPreferenceSlug = typeof VALID_ACTIVITY_PREFERENCE_SLUGS[number]
