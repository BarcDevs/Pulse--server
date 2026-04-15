export const recommendationsConfig = {
    semanticGatingThreshold: 0.15,
    generationPendingTimeoutMs: 10_000,
    maxRecommendationsPerUser: 5,
    candidatePoolLimit: 50,
    coldStartThreshold: 3,
    authorFatigueMultiplier: 0.7
}

export const highRiskTags = new Set([
    'self-harm',
    'suicide',
    'emergency',
    'crisis'
])

export const moderateRiskTags = new Set([
    'anxiety',
    'panic',
    'depression',
    'trauma'
])