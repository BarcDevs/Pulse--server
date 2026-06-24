import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import * as dailyObservationService from '../../services/dailyObservationService'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../services/dailyObservationService')

const mockGetTodayObservation =
    dailyObservationService.getTodayObservation as jest.Mock

describe('Insight Routes', () => {
    const baseUrl = `/api/${serverConfig.apiVersion}/insight`
    const endpoint = `${baseUrl}/observation`
    const mockUser = createMockUser()
    const token = createAuthToken(mockUser)

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe(`GET /api/${serverConfig.apiVersion}/insight/observation`, () => {
        it('returns 401 when not authenticated', async () => {
            const response = await supertest(App).get(endpoint)
            expect(response.status).toBe(401)
        })

        it('returns 200 with observation data when authenticated', async () => {
            const mockObservation = {
                title: 'Something noticed',
                type: 'activity_consistency',
                observation: 'Activities have appeared regularly in recent check-ins.',
                supportiveDescription: 'Small routines often become easier to notice over time.',
                icon: 'Activity'
            }

            mockGetTodayObservation.mockResolvedValue(mockObservation)

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Observation retrieved')
            expect(response.body.data).toMatchObject({
                title: 'Something noticed',
                type: expect.stringMatching(
                    /activity_consistency|checkin_consistency|streak_consistency|mood_stability|pain_improvement|better_days_pattern/
                ),
                observation: expect.any(String),
                supportiveDescription: expect.any(String),
                icon: expect.any(String)
            })
        })

        it('returns 200 with null data when no pattern detected', async () => {
            mockGetTodayObservation.mockResolvedValue(null)

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Observation retrieved')
            expect(response.body.data).toBeNull()
        })

        it('returns 500 when service throws', async () => {
            mockGetTodayObservation.mockRejectedValue(new Error('DB failure'))

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(500)
        })

        it('returns 401 with invalid token', async () => {
            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', ['accessToken=invalid.token.here'])

            expect(response.status).toBe(401)
        })

        it('calls service with correct userId', async () => {
            mockGetTodayObservation.mockResolvedValue(null)

            await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(mockGetTodayObservation).toHaveBeenCalledWith(mockUser.id)
        })

        it('returns observation with all required fields', async () => {
            const fullObservation = {
                title: 'Daily insight',
                type: 'mood_stability',
                observation: 'Your mood has been stable.',
                supportiveDescription: 'Stability is a sign of resilience.',
                icon: 'Smile',
                createdAt: new Date().toISOString()
            }
            mockGetTodayObservation.mockResolvedValue(fullObservation)

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.body.data).toMatchObject({
                title: expect.any(String),
                type: expect.any(String),
                observation: expect.any(String),
                supportiveDescription: expect.any(String),
                icon: expect.any(String)
            })
        })
    })
})
