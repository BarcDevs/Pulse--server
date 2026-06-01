import {
    highRiskTags,
    recommendationsConfig as recConfig
} from '../constants/recommendations'
import { dayInMs } from '../constants/time'
import { selectDiversePosts } from '../lib/recommendations/diversitySelector'
import { buildCheckInState } from '../lib/recommendations/inputModeling'
import {
    adaptWeights,
    computeConditionMatch,
    computeSemanticSimilarity,
    scorePost
} from '../lib/recommendations/scoring'
import * as checkInModel from '../models/checkInModel'
import * as forumModel from '../models/forumModel'
import * as recommendationsModel from '../models/recommendationsModel'
import type { PostType } from '../types/data/PostType'
import type {
    RecommendationResponseItem,
    RecommendationsResponse
} from '../types/data/RecommendationResponseType'
import type {
    CheckInState,
    PostRecommendationItem,
    RecommendationSnapshot
} from '../types/data/RecommendationType'
import { PostFilter } from '../types/query'
import logger from '../utils/logger'

const generateAction = (
    post: PostType
): Pick<RecommendationResponseItem, 'actionKey' | 'actionParams'> => {
    if (post.title.endsWith('?'))
        return { actionKey: 'recommendations.action.askedQuestion' }

    if (post.category) {
        return {
            actionKey: 'recommendations.action.postedAbout',
            actionParams: { category: post.category }
        }
    }
    return { actionKey: 'recommendations.action.sharedPost' }
}

const mapPostToRecommendation = (post: PostType): RecommendationResponseItem => ({
    id: post.id,
    userId: post.author?.user?.id ?? '',
    username: post.author?.user?.username ?? '',
    firstName: post.author?.user?.firstName ?? '',
    lastName: post.author?.user?.lastName ?? '',
    ...generateAction(post),
    timestamp: post.createdAt.toISOString()
})

const filterByGating = (
    candidates: PostType[],
    state: CheckInState
): PostType[] => {
    return candidates.filter((post) => {
        const condMatch = computeConditionMatch(
            state.keyIssueTags,
            post
        )
        const semanticMatch = computeSemanticSimilarity(
            state.keyIssueTags,
            post
        )

        return (
            condMatch > 0
            || semanticMatch > recConfig.semanticGatingThreshold
        )
    })
}

const applyEmotionalFiltering = (
    candidates: PostType[],
    emotionalState: string
): PostType[] => {
    if (emotionalState !== 'negative') return candidates

    return candidates.filter((post) => {
        const text = (
            post.title + ' ' + post.body
        ).toLowerCase()
        const tagNames = (post.tags || [])
            .map((tag) => tag.label.en.toLowerCase())
            .join(' ')

        const fullText = text + ' ' + tagNames

        for (const tag of highRiskTags) {
            if (fullText.includes(tag)) return false
        }

        return true
    })
}

const getRecentAuthorIds = (
    posts: PostType[],
    lastSnapshots: (RecommendationSnapshot | null)[]
): Set<string> => {
    const recentAuthorIds = new Set<string>()

    lastSnapshots.forEach((snapshot) => {
        if (!snapshot) return
        snapshot.items.forEach((item) => {
            const post = posts.find((p) => p.id === item.postId)
            if (post && post.authorId) {
                recentAuthorIds.add(post.authorId)
            }
        })
    })

    return recentAuthorIds
}

const getEngagementNormRange = (
    posts: PostType[]
): [number, number] => {
    let minEng = Infinity
    let maxEng = -Infinity

    posts.forEach((post) => {
        const likeCount = post._count?.likes ?? 0
        const replyCount = post._count?.replies ?? 0
        const views = post.views ?? 0

        const eng = likeCount
            + replyCount * 2
            + Math.sqrt(views)

        minEng = Math.min(minEng, eng)
        maxEng = Math.max(maxEng, eng)
    })

    return [
        minEng === Infinity ? 0 : minEng,
        maxEng === -Infinity ? 0 : maxEng
    ]
}

export const generateRecommendations = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    try {
        const currentCheckIn = await checkInModel.findCheckInById(checkInId)

        if (!currentCheckIn) return

        const profileId = currentCheckIn.profileId

        const allCheckIns = await checkInModel.getCheckIns(profileId, 100)
        const previousCheckIn = allCheckIns.length > 1
            ? allCheckIns[1]
            : undefined

        const firstCheckIn = allCheckIns[allCheckIns.length - 1]
        const daysSinceFirst = firstCheckIn
            ? Math.floor(
                (Date.now() - firstCheckIn.createdAt.getTime())
                / dayInMs
            )
            : 0

        const state = buildCheckInState(
            currentCheckIn,
            previousCheckIn,
            allCheckIns,
            daysSinceFirst
        )

        const latestSnapshot = await recommendationsModel.getLatestSnapshot(userId)
        const lastTwoSnapshots = latestSnapshot ? [latestSnapshot] : []

        const candidateFilters = {
            categories: currentCheckIn.activities.slice(0, 3),
            tags: currentCheckIn.activities,
            terms: state.keyIssueTags
        }

        let candidates = await recommendationsModel.getCandidatePosts(
            candidateFilters.categories,
            candidateFilters.tags,
            candidateFilters.terms,
            50
        )

        candidates = filterByGating(candidates, state)

        if (currentCheckIn.moodScore <= 5) {
            candidates = applyEmotionalFiltering(
                candidates,
                state.emotionalState
            )
        }

        const recentAuthorIds = getRecentAuthorIds(
            candidates,
            lastTwoSnapshots
        )

        if (candidates.length < recConfig.coldStartThreshold) {
            const topEngagement = await forumModel.getPosts({
                filter: PostFilter.POPULAR,
                limit: 10 - candidates.length
            })
            candidates = [
                ...candidates,
                ...topEngagement.filter(
                    (p) => !candidates.some(
                        (c) => c.id === p.id
                    )
                )
            ]
        }

        const engagementRange = getEngagementNormRange(candidates)
        const weights = adaptWeights(state)

        const scored = candidates.map((post) => {
            const scoredPost = scorePost(
                post,
                state,
                weights,
                engagementRange
            )
            if (post.authorId && recentAuthorIds.has(post.authorId)) {
                scoredPost.score *= recConfig.authorFatigueMultiplier
            }
            return scoredPost
        }).sort((a, b) => b.score - a.score)

        const selected = scored.length < 5
            ? scored.slice(0, Math.min(5, scored.length))
            : selectDiversePosts(scored, 5)

        const items: PostRecommendationItem[] = selected.map((s) => ({
            postId: s.post.id,
            score: s.score,
            contentType: s.contentType,
            breakdown: s.breakdown
        }))

        await recommendationsModel.saveSnapshot(
            userId,
            checkInId,
            items
        )

        logger.info('Recommendations generated', {
            userId,
            checkInId,
            candidatesBefore: candidates.length,
            candidatesAfter: scored.length,
            selectedCount: items.length,
            contentTypes: items.map((i) => i.contentType).join(','),
            topScores: items
                .slice(0, 3)
                .map((i) => i.score)
                .join(',')
        })
    } catch (err) {
        logger.error('Failed to generate recommendations', {
            userId,
            checkInId,
            error: err instanceof Error ? err.message : 'Unknown error'
        })

        await recommendationsModel.setPendingGeneration(userId, checkInId)
    }
}

export const generateRecommendationsSafely = async (
    userId: string,
    checkInId: string
): Promise<void> => {
    try {
        await recommendationsModel.setPendingGeneration(userId, checkInId)

        await generateRecommendations(userId, checkInId)
    } catch (err) {
        logger.error(
            'Recommendations service error',
            {
                userId,
                checkInId,
                error: err instanceof Error
                    ? err.message
                    : 'Unknown error'
            }
        )
    }
}

const getFallbackPosts = async (): Promise<RecommendationResponseItem[]> => {
    const fallback = await forumModel.getPosts({
        filter: PostFilter.POPULAR,
        limit: 5
    })
    return fallback.map(mapPostToRecommendation)
}

export const getRecommendations = async (
    userId: string
): Promise<RecommendationsResponse> => {
    try {
        const profileId = await checkInModel.getProfileIdForUser(userId)

        const latestCheckIn = (
            await checkInModel.getCheckIns(profileId, 1)
        )[0]

        if (!latestCheckIn) {
            return {
                status: 'processing',
                isStale: false,
                posts: await getFallbackPosts()
            }
        }

        const {
            snapshot,
            generationPending,
            pendingSince
        } =
            await recommendationsModel.getSnapshotWithFlags(
                latestCheckIn.id
            )

        if (
            generationPending
            && pendingSince
            && Date.now() - pendingSince.getTime()
            > recConfig.generationPendingTimeoutMs
        ) {
            await generateRecommendations(userId, latestCheckIn.id)

            const newSnapshot =
                await recommendationsModel.getLatestSnapshot(userId)

            if (newSnapshot) {
                const posts = await Promise.all(
                    newSnapshot.items.map((item) =>
                        forumModel.getPost(item.postId)
                    )
                )

                const validPosts = posts.filter(
                    (p) => p !== null
                ) as PostType[]

                const transformedPosts = validPosts.map(mapPostToRecommendation)

                const hasSufficientPosts = transformedPosts.length > 0
                const finalPosts = hasSufficientPosts
                    ? transformedPosts
                    : await getFallbackPosts()

                return {
                    status: hasSufficientPosts ? 'ready' : 'processing',
                    isStale: false,
                    posts: finalPosts,
                    generatedAt: newSnapshot.generatedAt,
                    basedOnCheckInId: newSnapshot.basedOnCheckInId
                }
            }

            return {
                status: 'processing',
                isStale: false,
                posts: await getFallbackPosts()
            }
        }

        if (!snapshot) {
            return {
                status: 'processing',
                isStale: false,
                posts: await getFallbackPosts()
            }
        }

        const isStale = snapshot.basedOnCheckInId !== latestCheckIn.id

        if (isStale && latestCheckIn.moodScore <= 5) {
            const stalePosts = await Promise.all(
                snapshot.items.map((item) => forumModel.getPost(item.postId))
            )
            const validStalePosts = stalePosts.filter((p) => p !== null) as PostType[]
            const transformedStalePosts = validStalePosts.map(mapPostToRecommendation)
            return {
                status: 'processing',
                isStale: true,
                posts: transformedStalePosts.length > 0
                    ? transformedStalePosts
                    : await getFallbackPosts(),
                generatedAt: snapshot.generatedAt,
                basedOnCheckInId: snapshot.basedOnCheckInId
            }
        }

        const posts = await Promise.all(
            snapshot.items.map((item) =>
                forumModel.getPost(item.postId)
            )
        )

        const validPosts = posts.filter(
            (p) => p !== null
        ) as PostType[]

        const transformedPosts = validPosts.map(mapPostToRecommendation)

        if (transformedPosts.length < 3) {
            await recommendationsModel.setPendingGeneration(
                userId,
                latestCheckIn.id
            )

            return {
                status: 'processing',
                isStale: false,
                posts: transformedPosts.length > 0
                    ? transformedPosts
                    : await getFallbackPosts()
            }
        }

        return {
            status: isStale ? 'processing' : 'ready',
            isStale,
            posts: transformedPosts,
            generatedAt: snapshot.generatedAt,
            basedOnCheckInId: snapshot.basedOnCheckInId
        }
    } catch (err) {
        logger.error('Failed to fetch recommendations', {
            userId,
            error: err instanceof Error
                ? err.message
                : 'Unknown error'
        })

        try {
            return {
                status: 'processing',
                isStale: false,
                posts: await getFallbackPosts()
            }
        } catch (fallbackErr) {
            logger.error('Failed to fetch fallback recommendations', {
                userId,
                error: fallbackErr instanceof Error
                    ? fallbackErr.message
                    : 'Unknown error'
            })
            return {
                status: 'processing',
                isStale: false,
                posts: []
            }
        }
    }
}
