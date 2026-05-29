// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../services/dailyObservationService')

describe('Insight Routes', () => {
    const baseUrl = '/api/v1/insight'
    const endpoint = `${baseUrl}/observation`
    const mockUser = createMockUser()
    const token = createAuthToken(mockUser)

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/v1/insight/observation', () => {
        it('should return 401 when not authenticated', async () => {
            const response = await supertest(App).get(endpoint)
            expect(response.status).toBe(401)
        })

        it('should return 200 with observation data when authenticated', async () => {
            const mockObservation = {
                title: 'Something noticed',
                type: 'activity_consistency',
                observation: 'Activities have appeared regularly in recent check-ins.',
                supportiveDescription: 'Small routines often become easier to notice over time.',
                icon: 'Activity'
            }

            const dailyObservationService = require(
                '../../services/dailyObservationService'
            )
            dailyObservationService.getTodayObservation
                .mockResolvedValue(mockObservation)

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

        it('should return 200 with null data when no pattern detected', async () => {
            const dailyObservationService = require(
                '../../services/dailyObservationService'
            )
            dailyObservationService.getTodayObservation
                .mockResolvedValue(null)

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Observation retrieved')
            expect(response.body.data).toBeNull()
        })
    })
})
