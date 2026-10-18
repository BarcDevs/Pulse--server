export const MIN_CONTENT_LENGTH = 20

// One regeneration when a reply fails validation; models are not deterministic
export const INSIGHT_GENERATION_ATTEMPTS = 2

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
