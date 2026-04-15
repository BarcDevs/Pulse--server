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
import * as checkInModel from '../models/CheckInModel'
import * as forumModel from '../models/ForumModel'
import * as recommendationsModel from '../models/RecommendationsModel'
import type { PostType } from '../types/data/PostType'
import type {
    CheckInState,
    PostRecommendationItem,
    RecommendationFeedResponse,
    RecommendationSnapshot
} from '../types/data/RecommendationType'
import { PostFilter } from '../types/query'
import logger from '../utils/logger'

const extractActivityCategories = (
    activities: string[]
): string[] => {
    return activities.slice(0, 3)
}

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
            .map((tag) => tag.name.toLowerCase())
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
        const votes = typeof post.votes === 'string'
            ? { upvotes: 0 }
            : post.votes
        const replyCount = post._count?.replies ?? 0
        const views = post.views ?? 0

        const eng = votes.upvotes
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
        const profileId = await checkInModel.getProfileIdForUser(userId)

        const currentCheckIn = await checkInModel.findTodayCheckIn(
            profileId,
            new Date()
        )

        if (!currentCheckIn) return

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

        const previousSnapshots = (
            await recommendationsModel.getLatestSnapshot(userId)
        )
            ? [
                await recommendationsModel.getLatestSnapshot(userId)
            ]
            : []

        const lastTwoSnapshots = previousSnapshots.slice(0, 2).filter(Boolean)

        const candidateFilters = {
            categories: extractActivityCategories(currentCheckIn.activities),
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

export const getRecommendations = async (
    userId: string
): Promise<RecommendationFeedResponse> => {
    try {
        const profileId = await checkInModel.getProfileIdForUser(userId)

        const latestCheckIn = (
            await checkInModel.getCheckIns(profileId, 1)
        )[0]

        if (!latestCheckIn) {
            return {
                status: 'processing',
                isStale: false,
                posts: []
            }
        }

        const { snapshot, generationPending, pendingSince } =
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

                return {
                    status: validPosts.length >= 3 ? 'ready' : 'processing',
                    isStale: false,
                    posts: validPosts,
                    generatedAt: newSnapshot.generatedAt,
                    basedOnCheckInId: newSnapshot.basedOnCheckInId
                }
            }

            return {
                status: 'processing',
                isStale: false,
                posts: []
            }
        }

        const isStale = snapshot
            ? snapshot.basedOnCheckInId !== latestCheckIn.id
            : false

        if (isStale && latestCheckIn.moodScore <= 5) {
            return {
                status: 'processing',
                isStale: true,
                posts: []
            }
        }

        if (!snapshot) {
            return {
                status: 'processing',
                isStale: false,
                posts: []
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

        if (validPosts.length < 3) {
            await recommendationsModel.setPendingGeneration(
                userId,
                latestCheckIn.id
            )

            return {
                status: 'processing',
                isStale: false,
                posts: validPosts
            }
        }

        return {
            status: isStale ? 'processing' : 'ready',
            isStale,
            posts: validPosts,
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

        return {
            status: 'processing',
            isStale: false,
            posts: []
        }
    }
}
