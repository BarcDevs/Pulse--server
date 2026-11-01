import { recommendationsConfig } from '../../constants/recommendations'
import * as checkInModel from '../../models/checkInModel'
import * as forumModel from '../../models/forumModel'
import * as recommendationsModel from '../../models/recommendationsModel'
import { generateRecommendations } from '../../services/recommendationsService'
import type { CheckInType } from '../../types/data/CheckInType'
import type { PostType } from '../../types/data/PostType'
import { prismaMock } from '../setup/jestSetup'

jest.mock('../../models/checkInModel')
jest.mock('../../models/forumModel')
jest.mock('../../models/queries/postQuery', () => ({
    postInclude: jest.fn(() => ({})),
    anonymizeAuthor: jest.fn((author) => author),
    withReplyCount: jest.fn((post) => post)
}))

const USER_ID = 'user-1'
const CHECKIN_ID = 'checkin-new'

const makePost = (id: string, authorId: string): PostType => ({
    id,
    title: 'walking tips',
    body: 'body',
    authorId,
    category: 'fitness',
    views: 50,
    createdAt: new Date(),
    tags: [],
    replies: [],
    _count: { replies: 2, likes: 5 }
} as unknown as PostType)

const checkIn = {
    id: CHECKIN_ID,
    profileId: 'profile-1',
    checkInDate: new Date(),
    moodScore: 7,
    painLevel: 3,
    activities: ['walking'],
    notes: null,
    createdAt: new Date(),
    insights: []
} as unknown as CheckInType

type Row = {
    userId: string
    generationPending: boolean
    generatedAt: Date
    checkInId: string
    items: unknown[]
}

describe('generateRecommendations author fatigue', () => {
    it('applies fatigue from the last real snapshot, not the pending placeholder', async () => {
        const rows: Row[] = [
            {
                userId: USER_ID,
                generationPending: false,
                generatedAt: new Date('2026-10-01'),
                checkInId: 'checkin-old',
                items: [{ postId: 'post-a' }]
            },
            {
                userId: USER_ID,
                generationPending: true,
                generatedAt: new Date('2026-10-02'),
                checkInId: CHECKIN_ID,
                items: []
            }
        ]

        prismaMock.postRecommendation.findFirst.mockImplementation(((args: {
            where: { userId: string, generationPending?: boolean }
        }) => {
            const found = rows
                .filter((r) => r.userId === args.where.userId
                    && (args.where.generationPending === undefined
                        || r.generationPending === args.where.generationPending))
                .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0]
            return Promise.resolve(found ?? null)
        }) as never)

        ;(checkInModel.findCheckInById as jest.Mock).mockResolvedValue(checkIn)
        ;(checkInModel.getCheckIns as jest.Mock).mockResolvedValue([checkIn])
        ;(forumModel.getPosts as jest.Mock).mockResolvedValue([])
        jest.spyOn(recommendationsModel, 'getCandidatePosts').mockResolvedValue([
            makePost('post-a', 'author-a'),
            makePost('post-b', 'author-b')
        ])
        const saveSpy = jest.spyOn(recommendationsModel, 'saveSnapshot').mockResolvedValue(undefined)

        await generateRecommendations(USER_ID, CHECKIN_ID)

        const items = saveSpy.mock.calls[0][2]
        const scoreOf = (id: string) => items.find((i) => i.postId === id)!.score
        expect(scoreOf('post-a')).toBeCloseTo(
            scoreOf('post-b') * recommendationsConfig.authorFatigueMultiplier
        )
    })
})
