// @ts-nocheck
import * as checkInModel from '../../models/checkInModel'
import * as forumModel from '../../models/forumModel'
import * as recommendationsModel from '../../models/recommendationsModel'
import { getRecommendations } from '../../services/recommendationsService'
import type { CheckInType } from '../../types/data/CheckInType'
import type { PostType } from '../../types/data/PostType'
import type {
    PostRecommendationItem,
    RecommendationSnapshot
} from '../../types/data/RecommendationType'

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

const makeCheckIn = (overrides?: Partial<CheckInType>): CheckInType => ({
    id: CHECKIN_ID,
    userId: USER_ID,
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

describe('recommendationsService.getRecommendations', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(checkInModel.getProfileIdForUser)
            .mockResolvedValue(PROFILE_ID)
    })

    it('returns processing state when user has no check-ins', async () => {
        jest.mocked(checkInModel.getCheckIns).mockResolvedValue([])

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(false)
        expect(result.posts).toEqual([])
    })

    it('returns processing when no snapshot exists for latest check-in', async () => {
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
        expect(result.posts).toEqual([])
    })

    it('returns ready state with posts when snapshot has 3+ valid posts', async () => {
        const posts = [makePost({ id: 'post-1' }), makePost({ id: 'post-2' }), makePost({ id: 'post-3' })]

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
    })

    it('returns processing + isStale when snapshot is for older check-in and mood is low', async () => {
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

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.isStale).toBe(true)
        expect(result.posts).toEqual([])
    })

    it('returns stale posts with processing status when stale and mood is normal', async () => {
        const oldCheckInId = 'old-checkin-id'
        const latestCheckIn = makeCheckIn({ moodScore: 7 })
        const posts = [makePost({ id: 'post-1' }), makePost({ id: 'post-2' }), makePost({ id: 'post-3' })]

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

    it('marks pending and returns processing when snapshot has fewer than 3 valid posts', async () => {
        jest.mocked(checkInModel.getCheckIns)
            .mockResolvedValue([makeCheckIn()])
        jest.mocked(recommendationsModel.getSnapshotWithFlags)
            .mockResolvedValue({
                snapshot: makeSnapshot({
                    items: [makeSnapshotItem('post-1'), makeSnapshotItem('post-2')]
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
        expect(recommendationsModel.setPendingGeneration).toHaveBeenCalledWith(
            USER_ID,
            CHECKIN_ID
        )
    })

    it('returns processing fallback when service throws internally', async () => {
        jest.mocked(checkInModel.getProfileIdForUser)
            .mockRejectedValue(new Error('DB down'))

        const result = await getRecommendations(USER_ID)

        expect(result.status).toBe('processing')
        expect(result.posts).toEqual([])
        expect(result.isStale).toBe(false)
    })
})
