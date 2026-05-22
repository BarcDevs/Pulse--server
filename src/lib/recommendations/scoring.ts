import { dayInMs } from '../../constants/time'
import type { PostType } from '../../types/data/PostType'
import type {
    CheckInState,
    ScoredPost,
    ScoringWeights
} from '../../types/data/RecommendationType'

export const DEFAULT_WEIGHTS: ScoringWeights = {
    semantic: 0.35,
    condition: 0.25,
    stage: 0.15,
    engagement: 0.10,
    recency: 0.10,
    userBehavior: 0.05
}

const normalizeScore = (value: number): number => {
    const clamped = Math.max(0, Math.min(1, value))
    return parseFloat(clamped.toFixed(3))
}

const jaccardSimilarity = (
    set1: string[],
    set2: string[]
): number => {
    if (set1.length === 0 || set2.length === 0) return 0

    const s1 = new Set(set1.map((s) => s.toLowerCase()))
    const s2 = new Set(set2.map((s) => s.toLowerCase()))

    let intersection = 0
    s1.forEach((item) => {
        if (s2.has(item)) intersection++
    })

    const union = s1.size + s2.size - intersection

    return intersection / union
}

const extractTokens = (text: string): string[] => {
    if (!text) return []
    return text
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 2)
}

export const computeSemanticSimilarity = (
    keyIssueTags: string[],
    post: PostType
): number => {
    const postTokens = [
        ...extractTokens(post.title),
        ...extractTokens(post.body)
    ]

    const similarity = jaccardSimilarity(keyIssueTags, postTokens)
    return normalizeScore(similarity)
}

export const computeConditionMatch = (
    activities: string[],
    post: PostType
): number => {
    const postTagNames = post.tags.map((t) => t.label.en.toLowerCase())
    const postText = (post.title + ' ' + post.category)
        .toLowerCase()

    let matches = 0
    for (const activity of activities) {
        const actLower = activity.toLowerCase()
        if (
            postTagNames.some((t) => t.includes(actLower))
            || postText.includes(actLower)
        ) {
            matches++
        }
    }

    const ratio = activities.length > 0
        ? matches / activities.length
        : 0

    return normalizeScore(ratio)
}

export const computeRecencyScore = (
    postDate: Date
): number => {
    const daysOld = (Date.now() - postDate.getTime()) / dayInMs
    const decayScore = Math.exp(-daysOld / 30)
    const withFloor = Math.max(0.2, decayScore)

    return normalizeScore(withFloor)
}

export const computeEngagementScore = (
    post: PostType,
    minEngagement: number,
    maxEngagement: number
): number => {
    const likeCount = post._count?.likes ?? 0
    const replyCount = post._count?.replies ?? 0
    const views = post.views ?? 0

    const rawScore = likeCount + replyCount * 2 + Math.sqrt(views)

    if (maxEngagement <= minEngagement) return 0.5

    const normalized = (rawScore - minEngagement) / (maxEngagement - minEngagement)

    return normalizeScore(normalized)
}

export const computeRecoveryStageMatch = (
    userStage: string,
    postDate: Date
): number => {
    const daysOld = (Date.now() - postDate.getTime()) / dayInMs

    if (userStage === 'early') return daysOld < 30 ? 1 : 0
    if (userStage === 'advanced') return daysOld < 90 ? 1 : 0

    return 0.5
}

export const adaptWeights = (
    state: CheckInState
): ScoringWeights => {
    const weights = { ...DEFAULT_WEIGHTS }

    if (state.trend === 'declining') {
        weights.semantic = 0.40
        weights.engagement = 0.05
    } else if (state.trend === 'improving') {
        weights.engagement = 0.15
        weights.recency = 0.15
    }

    return weights
}

export const scorePost = (
    post: PostType,
    state: CheckInState,
    weights: ScoringWeights,
    engagementNormRange: [number, number]
): ScoredPost => {
    const [minEng, maxEng] = engagementNormRange

    const semanticScore = computeSemanticSimilarity(
        state.keyIssueTags,
        post
    )

    const conditionScore = computeConditionMatch(
        state.keyIssueTags,
        post
    )

    const stageScore = computeRecoveryStageMatch(
        state.recoveryStage,
        post.createdAt
    )

    const engagementScore = computeEngagementScore(
        post,
        minEng,
        maxEng
    )
    const recencyScore = computeRecencyScore(post.createdAt)

    const totalScore = normalizeScore(
        semanticScore * weights.semantic
        + conditionScore * weights.condition
        + stageScore * weights.stage
        + engagementScore * weights.engagement
        + recencyScore * weights.recency
    )

    return {
        post,
        score: totalScore,
        contentType: 'neutral',
        breakdown: {
            semantic: semanticScore,
            condition: conditionScore,
            stage: stageScore,
            engagement: engagementScore,
            recency: recencyScore
        }
    }
}
