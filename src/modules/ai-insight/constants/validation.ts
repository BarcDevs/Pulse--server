const MIN_CONTENT_LENGTH = 20
const MAX_CONTENT_LENGTH = 500
const MAX_SENTENCES = 4

const HARD_BLOCK_PHRASES = [
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

const MEDICAL_TERMS = [
    'depression',
    'anxiety disorder',
    'mental disorder',
    'syndrome',
    'disease'
]

const DIAGNOSTIC_PHRASES = [
    'indicates',
    'suggests',
    'signs of',
    'symptoms of',
    'may have',
    'might have'
]

const FALLBACK_INSIGHTS = {
    MOOD_DROP_ALERT:
        'We noticed your mood has felt lower recently. Take a moment to check in with what may be weighing on you today. Noticing the pattern is already a meaningful step.',
    MOTIVATIONAL:
        'Thank you for checking in with yourself today. Consistency is a powerful part of your journey.',
    WEEKLY_SUMMARY:
        'You\'ve made time this week to reflect on your wellness. That dedication is something to acknowledge and build on.'
}

export {
    DIAGNOSTIC_PHRASES,
    FALLBACK_INSIGHTS,
    HARD_BLOCK_PHRASES,
    MAX_CONTENT_LENGTH,
    MAX_SENTENCES,
    MEDICAL_TERMS,
    MIN_CONTENT_LENGTH
}