export const VALID_HEALTH_INTEREST_SLUGS = [
    'rehabilitation',
    'physical-therapy',
    'occupational-therapy',
    'mobility',
    'injury-recovery',
    'surgery-recovery',
    'chronic-pain',
    'pain-management',
    'neurological-recovery',
    'strength-building',
    'nutrition',
    'sleep',
    'healthy-habits',
    'fitness',
    'self-care',
    'mental-health',
    'emotional-wellbeing',
    'stress-management',
    'mindfulness',
    'meditation',
    'motivation',
    'peer-support',
    'disability-support',
    'goal-progress'
] as const

export type HealthInterestSlug = typeof VALID_HEALTH_INTEREST_SLUGS[number]
