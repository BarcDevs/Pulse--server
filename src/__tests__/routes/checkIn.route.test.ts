// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import type {CheckInType} from '../../types/data/CheckInType'
import {prismaMock} from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

const createMockCheckIn = (
    overrides?: Partial<CheckInType>
): CheckInType => ({
    id: 'test-checkin-id-123',
    userId: 'test-user-id-123',
    checkInDate: new Date('2026-03-02T00:00:00Z'),
    moodScore: 7,
    painLevel: 3,
    activities: [
        'walking',
        'meditation'
    ],
    notes: 'Feeling good today',
    createdAt: new Date(),
    updatedAt: null,
    insights: [],
    ...overrides,
})

describe('Check-in Routes', () => {
    // ==================== GET CHECK-INS ====================
    describe('GET /api/v1/check-in', () => {
        const endpoint = '/api/v1/check-in'

        it(
            'should return 200 and check-ins array',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)
                const mockCheckIns = [
                    createMockCheckIn(),
                    createMockCheckIn({
                        id: 'test-checkin-id-456'
                    }),
                ]
                prismaMock.dailyCheckIn.findMany
                    .mockResolvedValue(mockCheckIns)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data)
                    .toBeInstanceOf(Array)
                expect(response.body.data)
                    .toHaveLength(2)
                expect(response.body.message)
                    .toContain('check-ins found')
            }
        )

        it(
            'should return 200 with limit query param',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)
                prismaMock.dailyCheckIn.findMany
                    .mockResolvedValue([createMockCheckIn()])

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])
                    .query({limit: 5})

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .get(endpoint)

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 403 for invalid limit (over 100)',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])
                    .query({limit: 200})

                expect(response.status).toBe(403)
            }
        )
    })

    // ==================== CREATE CHECK-IN ====================
    describe('POST /api/v1/check-in', () => {
        const endpoint = '/api/v1/check-in'
        const validBody = {
            moodScore: 7,
            painLevel: 3,
            activities: [
                'walking',
                'meditation'
            ],
            notes: 'Feeling good today',
        }

        it(
            'should return 201 when creating first check-in',
            async () => {
                const mockUser = createMockUser()
                const mockCheckIn = createMockCheckIn()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue({timezone: null})
                prismaMock.dailyCheckIn.findUnique
                    .mockResolvedValue(null)
                prismaMock.dailyCheckIn.create
                    .mockResolvedValue(mockCheckIn)
                prismaMock.user.update
                    .mockResolvedValue({} as any)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send(validBody)

                expect(response.status).toBe(201)
                expect(response.body.message)
                    .toBe('Check-in created successfully')
                expect(response.body.data.id)
                    .toBe(mockCheckIn.id)
                expect(response.body.data.moodScore)
                    .toBe(mockCheckIn.moodScore)
                expect(response.body.data.updatedAt)
                    .toBeNull()
            }
        )

        it(
            'should return 409 when check-in already exists today',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue({timezone: null})
                prismaMock.dailyCheckIn.findUnique
                    .mockResolvedValue(createMockCheckIn())

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send(validBody)

                expect(response.status).toBe(409)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(endpoint)
                    .send(validBody)

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])
                    .send(validBody)

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 403 for missing moodScore',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        painLevel: 3,
                        activities: ['walking']
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('moodScore')
            }
        )

        it(
            'should return 403 for missing painLevel',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        moodScore: 7,
                        activities: ['walking']
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('painLevel')
            }
        )

        it(
            'should return 403 for missing activities',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({
                        moodScore: 7,
                        painLevel: 3
                    })

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('activities')
            }
        )

        it(
            'should return 403 for moodScore out of range',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({...validBody, moodScore: 11})

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('moodScore')
            }
        )

        it(
            'should return 403 for painLevel out of range',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .post(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({...validBody, painLevel: 0})

                expect(response.status).toBe(403)
                expect(response.body.error[0].property)
                    .toBe('painLevel')
            }
        )
    })

    // ==================== UPDATE CHECK-IN ====================
    describe('PATCH /api/v1/check-in', () => {
        const endpoint = '/api/v1/check-in'
        const validBody = {
            moodScore: 9,
            activities: [
                'yoga',
                'reading'
            ],
        }

        it(
            'should return 200 when updating existing check-in',
            async () => {
                const mockUser = createMockUser()
                const updated = createMockCheckIn({
                    moodScore: 9,
                    activities: [
                        'yoga',
                        'reading'
                    ],
                    updatedAt: new Date(),
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue({timezone: null})
                prismaMock.dailyCheckIn.findUnique
                    .mockResolvedValue(createMockCheckIn())
                prismaMock.dailyCheckIn.update
                    .mockResolvedValue(updated)
                prismaMock.user.update
                    .mockResolvedValue({} as any)

                const response = await supertest(App)
                    .patch(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send(validBody)

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('Check-in updated successfully')
                expect(response.body.data.moodScore).toBe(9)
                expect(response.body.data.updatedAt)
                    .not.toBeNull()
            }
        )

        it(
            'should return 404 when no check-in exists today',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.profile.findUnique
                    .mockResolvedValue({timezone: null})
                prismaMock.dailyCheckIn.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .patch(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send(validBody)

                expect(response.status).toBe(404)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .patch(endpoint)
                    .send(validBody)

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 401 for missing CSRF token',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .patch(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])
                    .send(validBody)

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 403 for empty body',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await supertest(App)
                    .patch(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', csrfToken)
                    .send({})

                expect(response.status).toBe(403)
            }
        )
    })

    // ==================== GET CHECK-IN STATS ====================
    describe('GET /api/v1/check-in/stats', () => {
        const endpoint = '/api/v1/check-in/stats'

        it('should return 200 with stats', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([
                {
                    moodScore: 8,
                    painLevel: 2,
                    activities: [
                        'walking',
                        'yoga'
                    ],
                    checkInDate: new Date('2026-03-02T00:00:00Z')
                },
                {
                    moodScore: 6,
                    painLevel: 4,
                    activities: [
                        'walking',
                        'reading'
                    ],
                    checkInDate: new Date('2026-03-01T00:00:00Z')
                },
            ])

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [
                    `accessToken=${token}`
                ])

            expect(response.status).toBe(200)
            expect(response.body.data).toMatchObject({
                totalCheckIns: 2,
                averageMoodScore: 7,
                averagePainLevel: 3,
                topActivities: expect.arrayContaining([
                    'walking'
                ]),
                currentStreak: expect.any(Number),
                longestStreak: expect.any(Number),
            })
            expect(response.body.message)
                .toBe('Check-in stats retrieved')
        })

        it(
            'should return 200 with zero stats when no check-ins exist',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)
                prismaMock.dailyCheckIn.findMany
                    .mockResolvedValue([])

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data).toMatchObject({
                    totalCheckIns: 0,
                    averageMoodScore: 0,
                    averagePainLevel: 0,
                    topActivities: [],
                    currentStreak: 0,
                    longestStreak: 0,
                })
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .get(endpoint)

                expect(response.status).toBe(401)
            }
        )
    })
})