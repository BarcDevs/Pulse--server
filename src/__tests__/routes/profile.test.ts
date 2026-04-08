import request from 'supertest'

import App from '../../app'
import {
    HttpStatusCodes
} from '../../constants/httpStatusCodes'
import {prismaMock} from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockUser,
    withBearerAuth,
    withCsrfAuth
} from '../setup/testSetup'

const mockUser = createMockUser()
const mockProfile = {
    id: 'profile-123',
    userId: mockUser.id,
    image: null,
    bio: null,
    location: null,
    timezone: null,
    dateFormat: 'dd/mm/yyyy',
    theme: 'light',
    language: 'en-US',
    dailyReminder: true,
    communityAlerts: false,
    profileVisibility: 'friends',
    anonymousParticipation: true,
    lastCheckInAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
}

const mockHealthInterest = {
    id: 'health-1',
    slug: 'mental-health',
    name: 'Mental Health',
    description: 'Mental health support',
    category: 'Wellness',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
}

const mockActivityPreference = {
    id: 'activity-1',
    slug: 'meditation',
    name: 'Meditation',
    description: 'Meditation practices',
    category: 'Mindfulness',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
}

describe('Profile Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/v1/profile', () => {
        it(
            'should return user profile with interests',
            async () => {
                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile)
                prismaMock.profileHealthInterest.findMany
                    .mockResolvedValue([])
                prismaMock.profileActivityPreference
                    .findMany.mockResolvedValue([])

                const token = createAuthToken(mockUser)

                const res = await request(App)
                    .get('/api/v1/profile')
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(res.status).toBe(
                    HttpStatusCodes.OK
                )
                expect(res.body.data).toBeDefined()
                expect(res.body.data.userId).toBe(
                    mockUser.id
                )
            }
        )

        it(
            'should return 401 if not authenticated',
            async () => {
                const res = await request(App)
                    .get('/api/v1/profile')

                expect(res.status).toBe(
                    HttpStatusCodes.UNAUTHORIZED
                )
            }
        )
    })

    describe('PATCH /api/v1/profile', () => {
        it(
            'should update profile fields',
            async () => {
                const updated = {
                    ...mockProfile,
                    bio: 'Updated bio',
                    timezone: 'UTC'
                }

                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch('/api/v1/profile'),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                        bio: 'Updated bio',
                        timezone: 'UTC'
                    })

                expect(res.status).toBe(
                    HttpStatusCodes.OK
                )
                expect(res.body.data.bio).toBe(
                    'Updated bio'
                )
            }
        )

        it(
            'should reject invalid timezone',
            async () => {
                prismaMock.profile.findUnique
                    .mockResolvedValue(mockProfile)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch('/api/v1/profile'),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                        timezone: 'invalid-timezone'
                    })

                expect(res.status).toBe(
                    HttpStatusCodes.FORBIDDEN
                )
            }
        )
    })

    describe(
        'POST /api/v1/profile/health-interests',
        () => {
            it(
                'should add health interests',
                async () => {
                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile)
                    prismaMock.healthInterest.findUnique
                        .mockResolvedValue(
                            mockHealthInterest
                        )
                    prismaMock.profileHealthInterest
                        .upsert.mockResolvedValue({
                            id: 'link-1',
                            profileId:
                                mockProfile.id,
                            healthInterestId:
                                mockHealthInterest.id,
                            addedAt: new Date()
                        })
                    prismaMock.profileHealthInterest
                        .findMany
                        .mockResolvedValue([])
                    prismaMock
                        .profileActivityPreference
                        .findMany
                        .mockResolvedValue([])

                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const res = await request(App)
                        .post(
                            '/api/v1/profile/health-interests'
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )
                        .send({
                            slugs: [
                                'mental-health'
                            ]
                        })

                    expect(res.status).toBe(
                        HttpStatusCodes.OK
                    )
                    expect(
                        res.body.message
                    ).toContain('added')
                }
            )
        }
    )

    describe(
        'DELETE /api/v1/profile/health-interests/:slug',
        () => {
            it(
                'should remove health interest',
                async () => {
                    prismaMock.profile.findUnique
                        .mockResolvedValue(mockProfile)
                    prismaMock.healthInterest.findUnique
                        .mockResolvedValue(
                            mockHealthInterest
                        )
                    prismaMock
                        .profileHealthInterest
                        .deleteMany
                        .mockResolvedValue({
                            count: 1
                        })
                    prismaMock.profileHealthInterest
                        .findMany
                        .mockResolvedValue([])
                    prismaMock
                        .profileActivityPreference
                        .findMany
                        .mockResolvedValue([])

                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const res = await request(App)
                        .delete(
                            '/api/v1/profile/health-interests/mental-health'
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )

                    expect(res.status).toBe(
                        HttpStatusCodes.OK
                    )
                    expect(
                        res.body.message
                    ).toContain('removed')
                }
            )
        }
    )

    describe(
        'GET /api/v1/profile/list/health-interests',
        () => {
            it(
                'should list available interests',
                async () => {
                    prismaMock.healthInterest.findMany
                        .mockResolvedValue([
                            mockHealthInterest
                        ])

                    const res = await request(App)
                        .get(
                            '/api/v1/profile/list/health-interests'
                        )

                    expect(res.status).toBe(
                        HttpStatusCodes.OK
                    )
                    expect(
                        res.body.data
                    ).toHaveLength(1)
                    expect(
                        res.body.data[0].slug
                    ).toBe('mental-health')
                }
            )
        }
    )

    describe(
        'GET /api/v1/profile/list/activities',
        () => {
            it(
                'should list available activities',
                async () => {
                    prismaMock.activityPreference
                        .findMany
                        .mockResolvedValue([
                            mockActivityPreference
                        ])

                    const res = await request(App)
                        .get(
                            '/api/v1/profile/list/activities'
                        )

                    expect(res.status).toBe(
                        HttpStatusCodes.OK
                    )
                    expect(
                        res.body.data
                    ).toHaveLength(1)
                    expect(
                        res.body.data[0].slug
                    ).toBe('meditation')
                }
            )
        }
    )
})