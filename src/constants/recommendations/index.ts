import { minuteInMs } from '../time'

export const recommendationsConfig = {
    semanticGatingThreshold: 0.15,
    generationPendingTimeoutMs: minuteInMs,
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