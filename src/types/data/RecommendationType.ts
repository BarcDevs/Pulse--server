import type { PostType } from './PostType'

export type PostRecommendationItem = {
    postId: string
    score: number
    contentType: string
    breakdown: {
        semantic: number
        condition: number
        stage: number
        engagement: number
        recency: number
    }
}

export type RecommendationSnapshot = {
    items: PostRecommendationItem[]
    generatedAt: Date
    basedOnCheckInId: string
}

export type RecommendationFeedResponse = {
    status: 'ready' | 'processing'
    isStale: boolean
    posts: PostType[]
    generatedAt?: Date
    basedOnCheckInId?: string
}

export type CheckInState = {
    physicalState: 'good' | 'moderate' | 'poor'
    emotionalState: 'positive' | 'neutral' | 'negative'
    recoveryStage: 'early' | 'mid' | 'advanced'
    keyIssueTags: string[]
    trend: 'improving' | 'stable' | 'declining'
}

export type ScoringWeights = {
    semantic: number
    condition: number
    stage: number
    engagement: number
    recency: number
    userBehavior: number
}

export type ScoredPost = {
    post: PostType
    score: number
    contentType: string
    breakdown: {
        semantic: number
        condition: number
        stage: number
        engagement: number
        recency: number
    }
}
