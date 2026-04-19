import { dayInMs } from '../../../constants/time'
import {
    adaptWeights,
    computeConditionMatch,
    computeEngagementScore,
    computeRecencyScore,
    computeSemanticSimilarity,
    DEFAULT_WEIGHTS,
    scorePost } from '../../../lib/recommendations/scoring'
import type { PostType } from '../../../types/data/PostType'
import type { CheckInState } from '../../../types/data/RecommendationType'

const createMockPost = (overrides?: Partial<PostType>): PostType => ({
    id: 'post-id',
    title: 'Recovery tips for chronic pain',
    body: 'Walking and meditation helped me...',
    authorId: 'author-id',
    createdAt: new Date(Date.now() - 5 * dayInMs),
    updatedAt: undefined,
    votes: { upvotes: 5, upvotedBy: [] },
    views: 100,
    category: 'fitness',
    tags: [
        { id: 't1', name: 'walking', slug: 'walking', createdAt: new Date() },
        { id: 't2', name: 'pain-management', slug: 'pain-management', createdAt: new Date() }
    ],
    replies: [],
    _count: { replies: 3 },
    ...overrides
})

const createMockState = (
    overrides?: Partial<CheckInState>
): CheckInState => ({
    physicalState: 'moderate',
    emotionalState: 'positive',
    recoveryStage: 'mid',
    keyIssueTags: ['walking', 'meditation'],
    trend: 'stable',
    ...overrides
})

describe('scoring', () => {
    describe('computeSemanticSimilarity', () => {
        it('should compute Jaccard overlap', () => {
            const similarity = computeSemanticSimilarity(
                ['walking', 'meditation'],
                createMockPost()
            )

            expect(similarity).toBeGreaterThan(0)
            expect(similarity).toBeLessThanOrEqual(1)
        })

        it('should return 0 for empty tags', () => {
            const similarity = computeSemanticSimilarity(
                [],
                createMockPost()
            )

            expect(similarity).toBe(0)
        })
    })

    describe('computeConditionMatch', () => {
        it('should match activities with tags', () => {
            const match = computeConditionMatch(
                ['walking'],
                createMockPost()
            )

            expect(match).toBeGreaterThan(0)
        })

        it('should return 0 for empty activities', () => {
            const match = computeConditionMatch([], createMockPost())

            expect(match).toBe(0)
        })
    })

    describe('computeRecencyScore', () => {
        it('should penalize old posts', () => {
            const recent = computeRecencyScore(new Date())
            const old = computeRecencyScore(
                new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            )

            expect(recent).toBeGreaterThan(old)
        })

        it('should apply floor of 0.2', () => {
            const veryOld = computeRecencyScore(
                new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            )

            expect(veryOld).toBe(0.2)
        })
    })

    describe('computeEngagementScore', () => {
        it('should normalize engagement within pool', () => {
            const score = computeEngagementScore(
                createMockPost(),
                0,
                100
            )

            expect(score).toBeGreaterThanOrEqual(0)
            expect(score).toBeLessThanOrEqual(1)
        })

        it('should handle empty pool range', () => {
            const score = computeEngagementScore(
                createMockPost(),
                0,
                0
            )

            expect(score).toBe(0.5)
        })
    })

    describe('adaptWeights', () => {
        it('should boost semantic for declining trend', () => {
            const weights = adaptWeights({
                ...createMockState(),
                trend: 'declining'
            })

            expect(weights.semantic).toBe(0.4)
            expect(weights.engagement).toBe(0.05)
        })

        it('should boost engagement for improving trend', () => {
            const weights = adaptWeights({
                ...createMockState(),
                trend: 'improving'
            })

            expect(weights.engagement).toBe(0.15)
            expect(weights.recency).toBe(0.15)
        })

        it('should keep defaults for stable trend', () => {
            const weights = adaptWeights(createMockState())

            expect(weights.semantic).toBe(DEFAULT_WEIGHTS.semantic)
        })
    })

    describe('scorePost', () => {
        it('should return normalized total score', () => {
            const scored = scorePost(
                createMockPost(),
                createMockState(),
                DEFAULT_WEIGHTS,
                [0, 100]
            )

            expect(scored.score).toBeGreaterThanOrEqual(0)
            expect(scored.score).toBeLessThanOrEqual(1)
            expect(scored.breakdown).toEqual(
                expect.objectContaining({
                    semantic: expect.any(Number),
                    condition: expect.any(Number),
                    stage: expect.any(Number),
                    engagement: expect.any(Number),
                    recency: expect.any(Number)
                })
            )
        })
    })
})
