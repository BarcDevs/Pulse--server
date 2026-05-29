// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import * as recommendationsService
    from '../../services/recommendationsService'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../services/recommendationsService')

const endpoint = '/api/v1/forum/recommendations'

const makeReadyResponse = (posts = [{
    id: 'post-1',
    userId: 'user-123',
    username: 'john_doe',
    firstName: 'John',
    lastName: 'Doe',
    actionKey: 'recommendations.action.postedAbout',
    actionParams: { category: 'fitness' },
    timestamp: new Date().toISOString()
}]) => ({
    status: 'ready' as const,
    isStale: false,
    posts,
    generatedAt: new Date(),
    basedOnCheckInId: 'checkin-id-123'
})

const makeProcessingResponse = () => ({
    status: 'processing' as const,
    isStale: false,
    posts: []
})

describe('Recommendations Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/v1/forum/recommendations', () => {
        it('should return 401 for unauthenticated request', async () => {
            const response = await supertest(App).get(endpoint)

            expect(response.status).toBe(401)
        })

        it('should return 200 with processing status when no check-ins exist', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            jest.mocked(recommendationsService.getRecommendations)
                .mockResolvedValue(makeProcessingResponse())

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe('processing')
            expect(response.body.data.posts).toEqual([])
        })

        it('should return 200 with ready status and posts when recommendations exist', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            jest.mocked(recommendationsService.getRecommendations)
                .mockResolvedValue(makeReadyResponse())

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe('ready')
            expect(response.body.data.posts).toHaveLength(1)
            expect(response.body.data.isStale).toBe(false)
        })

        it('should return 200 with isStale true when snapshot is outdated', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            jest.mocked(recommendationsService.getRecommendations)
                .mockResolvedValue({
                    status: 'processing',
                    isStale: true,
                    posts: []
                })

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.data.isStale).toBe(true)
        })

        it('should return 200 with processing when service throws', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            jest.mocked(recommendationsService.getRecommendations)
                .mockRejectedValue(new Error('DB failure'))

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(500)
        })
    })
})
