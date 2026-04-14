export const MIN_CONTENT_LENGTH = 20
export const MAX_CONTENT_LENGTH = 500
export const MAX_SENTENCES = 4

export const HARD_BLOCK_PHRASES = [
    'you may have',
    'you might have',
    'this may indicate',
    'this could indicate',
    'symptoms of',
    'diagnosed with',
    'diagnosis',
    'treatment plan',
    'clinical condition'
]

export const MEDICAL_TERMS = [
    'depression',
    'anxiety disorder',
    'mental disorder',
    'syndrome',
    'disease'
]

export const DIAGNOSTIC_PHRASES = [
    'indicates',
    'suggests',
    'signs of',
    'symptoms of',
    'may have',
    'might have'
]

export const FALLBACK_INSIGHTS = {
    MOOD_DROP_ALERT:
        'We noticed your mood has felt lower recently. Take a moment to check in with what may be weighing on you today. Noticing the pattern is already a meaningful step.',
    MOTIVATIONAL:
        'Thank you for checking in with yourself today. Consistency is a powerful part of your journey.',
    WEEKLY_SUMMARY:
        'You\'ve made time this week to reflect on your wellness. That dedication is something to acknowledge and build on.',
    BAD_DAY_SUPPORT:
        'You\'re noticing things are harder today. That awareness is the first step. Take what support feels right for you.'
}