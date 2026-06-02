// @ts-nocheck
import request from 'supertest'

import App from '../../app'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockUser,
    withCsrfAuth
} from '../setup/testSetup'

const createMockProfile = (
    overrides?: Record<string, unknown>
) => ({
    id: 'profile-123',
    userId: 'user-123',
    image: null,
    bio: null,
    location: null,
    timezone: null,
    theme: 'light',
    language: 'en-US',
    dailyReminder: true,
    communityAlerts: false,
    profileVisibility: 'friends',
    anonymousParticipation: true,
    lastCheckInAt: null,
    dateOfBirth: null,
    recoveryType: null,
    careProvider: null,
    healthInterests: [] as string[],
    activityPreferences: [] as string[],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

describe('Profile Routes', () => {
    const mockUser = createMockUser()
    const mockProfile = createMockProfile({
        userId: mockUser.id
    })

    beforeEach(() => {
        jest.clearAllMocks()
        prismaMock.profile.findUnique
            .mockResolvedValue(mockProfile)
        prismaMock.postLike.findMany
            .mockResolvedValue([])
        prismaMock.replyLike.findMany
            .mockResolvedValue([])
        prismaMock.savedPost.findMany
            .mockResolvedValue([])
    })

    // ==================== GET PROFILE ====================
    describe('GET /api/v1/profile', () => {
        const endpoint = '/api/v1/profile'

        it(
            'should return 200 with profile data',
            async () => {
                const token = createAuthToken(mockUser)

                const res = await request(App)
                    .get(endpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(res.status).toBe(200)
                expect(res.body.data).toBeDefined()
                expect(res.body.data.userId).toBe(
                    mockUser.id
                )
                expect(res.body.message).toContain(
                    'retrieved'
                )
            }
        )

        it(
            'should include health interests in profile',
            async () => {
                const token = createAuthToken(mockUser)
                prismaMock.profile.findUnique
                    .mockResolvedValue(createMockProfile({
                        userId: mockUser.id,
                        healthInterests: ['mental-health']
                    }))

                const res = await request(App)
                    .get(endpoint)
                    .set('Cookie', [`accessToken=${token}`])

                expect(res.status).toBe(200)
                expect(
                    res.body.data.healthInterests
                ).toBeInstanceOf(Array)
            }
        )

        it(
            'should return 401 if not authenticated',
            async () => {
                const res = await request(App)
                    .get(endpoint)

                expect(res.status).toBe(401)
                expect(res.body.error).toBeDefined()
            }
        )
    })

    // ==================== UPDATE PROFILE ====================
    describe('PATCH /api/v1/profile', () => {
        const endpoint = '/api/v1/profile'

        it(
            'should update bio and timezone',
            async () => {
                const updated = {
                    ...mockProfile,
                    bio: 'Updated bio',
                    timezone: 'America/New_York'
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    bio: 'Updated bio',
                    timezone: 'America/New_York'
                })

                expect(res.status).toBe(200)
                expect(res.body.data.bio).toBe(
                    'Updated bio'
                )
                expect(res.body.message).toContain(
                    'updated'
                )
            }
        )

        it(
            'should update theme to dark',
            async () => {
                const updated = {
                    ...mockProfile,
                    theme: 'dark'
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ theme: 'dark' })

                expect(res.status).toBe(200)
                expect(res.body.data.theme).toBe('dark')
            }
        )

        it(
            'should update image URL',
            async () => {
                const imageUrl =
                    'https://example.com/image.jpg'
                const updated = {
                    ...mockProfile,
                    image: imageUrl
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ image: imageUrl })

                expect(res.status).toBe(200)
                expect(res.body.data.image).toBe(
                    imageUrl
                )
            }
        )

        it(
            'should update profile visibility',
            async () => {
                const updated = {
                    ...mockProfile,
                    profileVisibility: 'public'
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    profileVisibility: 'public'
                })

                expect(res.status).toBe(200)
                expect(
                    res.body.data.profileVisibility
                ).toBe('public')
            }
        )

        it(
            'should update multiple fields at once',
            async () => {
                const updated = {
                    ...mockProfile,
                    bio: 'My bio',
                    location: 'New York',
                    dailyReminder: false,
                    communityAlerts: true
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    bio: 'My bio',
                    location: 'New York',
                    dailyReminder: false,
                    communityAlerts: true
                })

                expect(res.status).toBe(200)
                expect(res.body.data.bio).toBe('My bio')
                expect(
                    res.body.data.location
                ).toBe('New York')
                expect(
                    res.body.data.dailyReminder
                ).toBe(false)
                expect(
                    res.body.data.communityAlerts
                ).toBe(true)
            }
        )

        it(
            'should reject invalid timezone format',
            async () => {
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    timezone: 'invalid-timezone'
                })

                expect(res.status).toBe(400)
                expect(
                    res.body.error[0].property
                ).toBe('timezone')
            }
        )

        it(
            'should reject invalid theme value',
            async () => {
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ theme: 'invalid' })

                expect(res.status).toBe(400)
                expect(
                    res.body.error[0].property
                ).toBe('theme')
            }
        )

        it(
            'should reject bio over 500 chars',
            async () => {
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)
                const longBio = 'a'.repeat(501)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ bio: longBio })

                expect(res.status).toBe(400)
                expect(
                    res.body.error[0].property
                ).toBe('bio')
            }
        )

        it(
            'should update dateOfBirth',
            async () => {
                const dob = new Date('1990-01-15')
                const updated = {
                    ...mockProfile,
                    dateOfBirth: dob
                }
                prismaMock.profile.update
                    .mockResolvedValue(updated)

                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ dateOfBirth: '1990-01-15' })

                expect(res.status).toBe(200)
                expect(
                    res.body.data.dateOfBirth
                ).toBeDefined()
            }
        )

        it(
            'should reject invalid dateOfBirth format',
            async () => {
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ dateOfBirth: 'not-a-date' })

                expect(res.status).toBe(400)
                expect(
                    res.body.error[0].property
                ).toBe('dateOfBirth')
            }
        )

        it(
            'should reject invalid image URL',
            async () => {
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const res = await withCsrfAuth(
                    request(App).patch(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ image: 'not-a-url' })

                expect(res.status).toBe(400)
            }
        )

        it(
            'should return 401 if not authenticated',
            async () => {
                const res = await request(App)
                    .patch(endpoint)
                    .send({ bio: 'Updated' })

                expect(res.status).toBe(401)
            }
        )

        it(
            'should require CSRF token',
            async () => {
                const token = createAuthToken(mockUser)

                const res = await request(App)
                    .patch(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        '_csrf=invalid-secret'
                    ])
                    .set('x-csrf-token', 'invalid-token')
                    .send({ bio: 'Updated' })

                expect(res.status).toBe(401)
            }
        )
    })

    // ==================== HEALTH INTERESTS & ACTIVITY PREFERENCES ====================
    describe(
        'PATCH /api/v1/profile — healthInterests',
        () => {
            const endpoint = '/api/v1/profile'

            it(
                'should set healthInterests array',
                async () => {
                    const updated = {
                        ...mockProfile,
                        healthInterests: ['mental-health', 'fitness']
                    }
                    prismaMock.profile.update
                        .mockResolvedValue(updated)

                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    const res = await withCsrfAuth(
                        request(App).patch(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        healthInterests: ['mental-health', 'fitness']
                    })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data.healthInterests
                    ).toEqual(['mental-health', 'fitness'])
                }
            )

            it(
                'should reject invalid health interest slug',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    const res = await withCsrfAuth(
                        request(App).patch(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        healthInterests: ['not-a-valid-slug']
                    })

                    expect(res.status).toBe(400)
                    expect(res.body.error).toBeDefined()
                }
            )
        }
    )

    describe(
        'PATCH /api/v1/profile — activityPreferences',
        () => {
            const endpoint = '/api/v1/profile'

            it(
                'should set activityPreferences array',
                async () => {
                    const updated = {
                        ...mockProfile,
                        activityPreferences: ['walking', 'mindfulness']
                    }
                    prismaMock.profile.update
                        .mockResolvedValue(updated)

                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    const res = await withCsrfAuth(
                        request(App).patch(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        activityPreferences: ['walking', 'mindfulness']
                    })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data.activityPreferences
                    ).toEqual(['walking', 'mindfulness'])
                }
            )

            it(
                'should reject invalid activity preference slug',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } = createAuthenticatedRequest(mockUser)

                    const res = await withCsrfAuth(
                        request(App).patch(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({
                        activityPreferences: ['not-a-valid-slug']
                    })

                    expect(res.status).toBe(400)
                    expect(res.body.error).toBeDefined()
                }
            )
        }
    )

    // ==================== LIST ENDPOINTS ====================
    describe(
        'GET /api/v1/profile/list/health-interests',
        () => {
            const endpoint =
                '/api/v1/profile/list/health-interests'

            it(
                'should return available health interests',
                async () => {
                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                    ).toHaveLength(24)
                    expect(
                        res.body.data[0]
                    ).toBe('rehabilitation')
                    expect(
                        res.body.message
                    ).toContain('available')
                }
            )

            it(
                'should be publicly accessible',
                async () => {
                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                }
            )
        }
    )

    describe(
        'GET /api/v1/profile/list/activities',
        () => {
            const endpoint =
                '/api/v1/profile/list/activities'

            it(
                'should return available activity preferences',
                async () => {
                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                    ).toHaveLength(16)
                    expect(
                        res.body.data[0]
                    ).toBe('walking')
                    expect(
                        res.body.message
                    ).toContain('available')
                }
            )

            it(
                'should be publicly accessible',
                async () => {
                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                }
            )
        }
    )
})