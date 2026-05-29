export type RecommendationResponseItem = {
    id: string
    userId: string
    username: string
    firstName: string
    lastName: string
    actionKey: string
    actionParams?: Record<string, string>
    timestamp: string
}

export type RecommendationsResponse = {
    status: 'ready' | 'processing'
    isStale: boolean
    posts: RecommendationResponseItem[]
    generatedAt?: Date
    basedOnCheckInId?: string
}
