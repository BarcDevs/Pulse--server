// @ts-nocheck
import * as checkInModel
    from '../../models/checkInModel'
import * as forumModel
    from '../../models/forumModel'
import * as recommendationsModel
    from '../../models/recommendationsModel'
import { getRecommendations }
    from '../../services/recommendationsService'
import type { CheckInType }
    from '../../types/data/CheckInType'
import type { PostType }
    from '../../types/data/PostType'
import type {
    PostRecommendationItem,
    RecommendationSnapshot
} from '../../types/data/RecommendationType'
import { PostFilter } from '../../types/query'

jest.mock('../../models/checkInModel')
jest.mock('../../models/recommendationsModel')
jest.mock('../../models/forumModel')
jest.mock('../../services/recommendationsService', () => {
    const actual = jest.requireActual('../../services/recommendationsService')
    return {
        ...actual,
        generateRecommendations: jest.fn().mockResolvedValue(undefined)
    }
})

const PROFILE_ID = 'profile-id-123'
const USER_ID = 'user-id-123'
const CHECKIN_ID = 'checkin-id-123'

const makeFallbackPosts = (): PostType[] =>
    Array.from({ length: 5 }, (_, i) =>
        makePost({ id: `fallback-post-${i}`, title: `Popular post ${i}` })
    )

const makeCheckIn = (overrides?: Partial<CheckInType>): CheckInType => ({
    id: CHECKIN_ID,
    profileId: PROFILE_ID,
    checkInDate: new Date('2026-05-29T00:00:00Z'),
    moodScore: 7,
    painLevel: 3,
    activities: ['walking', 'meditation'],
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides
})

const makePost = (overrides?: Partial<PostType>): PostType => ({
    id: 'post-id-123',
    title: 'Recovery tips',
    body: 'Walking helped me recover',
    authorId: 'author-id-123',
    category: 'fitness',
    views: 50,
    createdAt: new Date(),
    updatedAt: undefined,
    tags: [],
    replies: [],
    _count: { replies: 2, likes: 5 },
    ...overrides
})

const makeSnapshotItem = (postId: string): PostRecommendationItem => ({
    postId,
    score: 0.85,
    contentType: 'informational',
    breakdown: {
        semantic: 0.3,
        condition: 0.2,
        stage: 0.1,
        engagement: 0.15,
        recency: 0.1
    }
})

const makeSnapshot = (overrides = {}): RecommendationSnapshot => ({
    items: [
        makeSnapshotItem('post-1'),
        makeSnapshotItem('post-2'),
        makeSnapshotItem('post-3')
    ],
    generatedAt: new Date(),
    basedOnCheckInId: CHECKIN_ID,
    ...overrides
})

const mockReadySnapshotFlow = (firstPost: PostType): void => {
    jest.mocked(checkInModel.getCheckIns)
        .mockResolvedValue([makeCheckIn()])
    jest.mocked(recommendationsModel.getSnapshotWithFlags)
        .mockResolvedValue({
            snapshot: makeSnapshot(),
            generationPending: false,
            pendingSince: null
        })
    jest.mocked(forumModel.getPost)
        .mockResolvedValueOnce(firstPost)
        .mockResolvedValueOnce(makePost({ id: 'post-2' }))
        .mockResolvedValueOnce(makePost({ id: 'post-3' }))
}

describe('recommendationsService.getRecommendations', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(checkInModel.getProfileIdForUser)
            .mockResolvedValue(PROFILE_ID)
        jest.mocked(forumModel.getPosts)
            .mockResolvedValue(makeFallbackPosts())
    })

    it('returns processing state with fallback posts when user has no check-ins', async () => {
        jest.mocked(checkInModel.getCheckIns).mockResolvedValue([])

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(false)
        expect(result.posts.length).toBeGreaterThan(0)
        expect(forumModel.getPosts).toHaveBeenCalledWith({
            filter: PostFilter.POPULAR,
            limit: 5
        })
    })

    it('returns processing with fallback posts when no snapshot exists', async () => {
        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: null,
                generationPending: false,
                pendingSince: null
            })

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.posts.length).toBeGreaterThan(0)
        expect(forumModel.getPosts).toHaveBeenCalled()
    })

    it('returns ready state with posts when snapshot has 3+ valid posts', async () => {
        const posts = [
            makePost({
                id: 'post-1',
                title: 'Recovery tips',
                category: 'fitness'
            }),
            makePost({
                id: 'post-2',
                title: 'How to sleep better?',
                category: 'wellness'
            }),
            makePost({
                id: 'post-3',
                title: 'Motivation boost',
                category: 'mental health'
            })
        ]

        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot(),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValueOnce(posts[0])
            .mockResolvedValueOnce(posts[1])
            .mockResolvedValueOnce(posts[2])

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('ready')
        expect(result.isStale).toBe(false)
        expect(result.posts).toHaveLength(3)
        expect(result.basedOnCheckInId).toBe(CHECKIN_ID)

        // Verify transformed response structure
        expect(result.posts[0]).toHaveProperty('id')
        expect(result.posts[0]).toHaveProperty('userId')
        expect(result.posts[0]).toHaveProperty('username')
        expect(result.posts[0]).toHaveProperty('firstName')
        expect(result.posts[0]).toHaveProperty('lastName')
        expect(result.posts[0]).toHaveProperty('actionKey')
        expect(result.posts[0]).toHaveProperty('timestamp')
    })

    it('returns stale snapshot posts when stale and mood is low', async () => {
        const oldCheckInId = 'old-checkin-id'
        const latestCheckIn = makeCheckIn({ moodScore: 4 })
        const stalePosts = [
            makePost({ id: 'post-1' }),
            makePost({ id: 'post-2' }),
            makePost({ id: 'post-3' })
        ]

        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([latestCheckIn])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot({ basedOnCheckInId: oldCheckInId }),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValueOnce(stalePosts[0])
            .mockResolvedValueOnce(stalePosts[1])
            .mockResolvedValueOnce(stalePosts[2])

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(true)
        expect(result.posts).toHaveLength(3)
    })

    it('returns fallback posts when stale, mood is low, and all stale posts are deleted', async () => {
        const oldCheckInId = 'old-checkin-id'
        const latestCheckIn = makeCheckIn({ moodScore: 4 })

        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([latestCheckIn])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot({ basedOnCheckInId: oldCheckInId }),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValue(null)

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(true)
        expect(result.posts.length).toBeGreaterThan(0)
        expect(forumModel.getPosts).toHaveBeenCalled()
    })

    it('returns stale posts with processing status when stale and mood is normal', async () => {
        const oldCheckInId = 'old-checkin-id'
        const latestCheckIn = makeCheckIn({ moodScore: 7 })
        const posts = [
            makePost({ id: 'post-1' }),
            makePost({ id: 'post-2' }),
            makePost({ id: 'post-3' })
        ]

        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([latestCheckIn])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot({ basedOnCheckInId: oldCheckInId }),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValueOnce(posts[0])
            .mockResolvedValueOnce(posts[1])
            .mockResolvedValueOnce(posts[2])

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(true)
        expect(result.posts).toHaveLength(3)
    })

    it('marks pending and returns the valid post when snapshot has fewer than 3', async () => {
        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot({
                    items: [
                        makeSnapshotItem('post-1'),
                        makeSnapshotItem('post-2')
                    ]
                }),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValueOnce(makePost({ id: 'post-1' }))
            .mockResolvedValueOnce(null)
        jest.mocked(recommendationsModel.setPendingGeneration)
            .mockResolvedValue(undefined)

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.posts).toHaveLength(1)
        expect(result.posts[0].id).toBe('post-1')
        expect(recommendationsModel.setPendingGeneration).toHaveBeenCalledWith(
            USER_ID,
            CHECKIN_ID
        )
    })

    it('returns fallback posts when snapshot items all resolve to null (posts deleted)', async () => {
        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot(),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost).mockResolvedValue(null)
        jest.mocked(recommendationsModel.setPendingGeneration)
            .mockResolvedValue(undefined)

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.posts.length).toBeGreaterThan(0)
        expect(forumModel.getPosts).toHaveBeenCalledWith({
            filter: PostFilter.POPULAR,
            limit: 5
        })
    })

    it('returns processing with fallback posts when service throws internally', async () => {
        jest.mocked(checkInModel.getProfileIdForUser)
            .mockRejectedValue(new Error('DB down'))

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(false)
        expect(result.posts.length).toBeGreaterThan(0)
    })

    it('returns processing with empty posts when both main logic and fallback fail', async () => {
        jest.mocked(checkInModel.getProfileIdForUser)
            .mockRejectedValue(new Error('DB down'))
        jest.mocked(forumModel.getPosts)
            .mockRejectedValue(new Error('DB down'))

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(false)
        expect(result.posts).toEqual([])
    })

    it('generates question action when title ends with question mark', async () => {
        const post = makePost({
            id: 'post-1',
            title: 'How to recover faster?',
            category: 'fitness'
        })

        mockReadySnapshotFlow(post)

        const result = await getRecommendations(USER_ID)

        expect(result.posts[0].actionKey).toBe('recommendations.action.askedQuestion')
    })

    it('generates shared progress action for sharedProgress category posts', async () => {
        const post = makePost({
            id: 'post-1',
            title: 'My recovery this month',
            category: 'sharedProgress'
        })

        mockReadySnapshotFlow(post)

        const result = await getRecommendations(USER_ID)

        expect(result.posts[0].actionKey).toBe('recommendations.action.sharedProgress')
        expect(result.posts[0].actionParams).toBeUndefined()
    })

    it('generates category action for non-question posts', async () => {
        const post = makePost({
            id: 'post-1',
            title: 'Recovery tips',
            category: 'wellness'
        })

        mockReadySnapshotFlow(post)

        const result = await getRecommendations(USER_ID)

        expect(result.posts[0].actionKey).toBe('recommendations.action.postedAbout')
        expect(result.posts[0].actionParams).toEqual({ category: 'wellness' })
    })

    it('returns user info in transformed response', async () => {
        const post = makePost({
            id: 'post-1',
            title: 'Tips',
            category: 'fitness',
            author: {
                id: 'profile-1',
                image: 'image.jpg',
                user: {
                    id: 'user-123',
                    username: 'john_doe',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            }
        })

        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot(),
                generationPending: false,
                pendingSince: null
            })
        jest.mocked(forumModel.getPost)
            .mockResolvedValueOnce(post)
            .mockResolvedValueOnce(makePost({ id: 'post-2' }))
            .mockResolvedValueOnce(makePost({ id: 'post-3' }))

        const result = await getRecommendations(USER_ID)

        expect(result.posts[0].userId).toBe('user-123')
        expect(result.posts[0].username).toBe('john_doe')
        expect(result.posts[0].firstName).toBe('John')
        expect(result.posts[0].lastName).toBe('Doe')
        expect(result.posts[0].timestamp).toBe(post.createdAt.toISOString())
    })
})
