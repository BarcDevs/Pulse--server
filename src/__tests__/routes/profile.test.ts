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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

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
    const mockUser = createMockUser()
    const mockProfile = createMockProfile({
        userId: mockUser.id
    })

    beforeEach(() => {
        jest.clearAllMocks()
        prismaMock.profile.findUnique
            .mockResolvedValue(mockProfile)
    })

    // ==================== GET PROFILE ====================
    describe('GET /api/v1/profile', () => {
        const endpoint = '/api/v1/profile'

        it(
            'should return 200 with profile data',
            async () => {
                const token = createAuthToken(mockUser)
                prismaMock.profileHealthInterest
                    .findMany.mockResolvedValue([])
                prismaMock.profileActivityPreference
                    .findMany.mockResolvedValue([])

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
                prismaMock.profileHealthInterest
                    .findMany.mockResolvedValue([{
                        profileId: mockProfile.id,
                        healthInterestId: 'health-1',
                        addedAt: new Date(),
                        healthInterest: mockHealthInterest
                    }])
                prismaMock.profileActivityPreference
                    .findMany.mockResolvedValue([])

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

                expect(res.status).toBe(403)
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

                expect(res.status).toBe(403)
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

                expect(res.status).toBe(403)
                expect(
                    res.body.error[0].property
                ).toBe('bio')
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

                expect(res.status).toBe(403)
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

    // ==================== HEALTH INTERESTS ====================
    describe(
        'POST /api/v1/profile/health-interests',
        () => {
            const endpoint =
                '/api/v1/profile/health-interests'

            it(
                'should add single health interest',
                async () => {
                    prismaMock.healthInterest
                        .findUnique
                        .mockResolvedValue(
                            mockHealthInterest
                        )
                    prismaMock
                        .profileHealthInterest
                        .upsert.mockResolvedValue({
                        id: 'link-1',
                        profileId: mockProfile.id,
                        healthInterestId:
                            mockHealthInterest.id,
                        addedAt: new Date()
                    })
                    prismaMock
                        .profileHealthInterest
                        .findMany
                        .mockResolvedValue([{
                            profileId: mockProfile.id,
                            healthInterestId:
                                mockHealthInterest.id,
                            addedAt: new Date(),
                            healthInterest:
                                mockHealthInterest
                        }])
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
                        .post(endpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )
                        .send({
                            slugs: ['mental-health']
                        })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.message
                    ).toContain('added')
                }
            )

            it(
                'should add multiple health interests',
                async () => {
                    const interest2 = {
                        ...mockHealthInterest,
                        id: 'health-2',
                        slug: 'fitness'
                    }

                    prismaMock.healthInterest
                        .findUnique
                        .mockResolvedValueOnce(
                            mockHealthInterest
                        )
                        .mockResolvedValueOnce(interest2)

                    prismaMock
                        .profileHealthInterest
                        .upsert
                        .mockResolvedValueOnce({
                            id: 'link-1',
                            profileId: mockProfile.id,
                            healthInterestId:
                                mockHealthInterest.id,
                            addedAt: new Date()
                        })
                        .mockResolvedValueOnce({
                            id: 'link-2',
                            profileId: mockProfile.id,
                            healthInterestId:
                                interest2.id,
                            addedAt: new Date()
                        })

                    prismaMock
                        .profileHealthInterest
                        .findMany
                        .mockResolvedValue([
                            {
                                profileId:
                                    mockProfile.id,
                                healthInterestId:
                                    mockHealthInterest.id,
                                addedAt: new Date(),
                                healthInterest:
                                    mockHealthInterest
                            },
                            {
                                profileId:
                                    mockProfile.id,
                                healthInterestId:
                                    interest2.id,
                                addedAt: new Date(),
                                healthInterest: interest2
                            }
                        ])
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
                        .post(endpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )
                        .send({
                            slugs: ['mental-health', 'fitness']
                        })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                            .healthInterests
                    ).toHaveLength(2)
                }
            )

            it(
                'should return 401 if not authenticated',
                async () => {
                    const res = await request(App)
                        .post(endpoint)
                        .send({
                            slugs: ['mental-health']
                        })

                    expect(res.status).toBe(401)
                }
            )

            it(
                'should reject missing slugs array',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const res = await withCsrfAuth(
                        request(App).post(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({})

                    expect(res.status).toBe(403)
                    expect(res.body.error).toBeDefined()
                }
            )

            it(
                'should reject empty slugs array',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const res = await withCsrfAuth(
                        request(App).post(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({ slugs: [] })

                    expect(res.status).toBe(403)
                    expect(res.body.error).toBeDefined()
                }
            )
        }
    )

    describe(
        'DELETE /api/v1/profile/health-interests/:slug',
        () => {
            const endpoint =
                '/api/v1/profile/health-interests'

            it(
                'should remove health interest',
                async () => {
                    prismaMock.healthInterest
                        .findUnique
                        .mockResolvedValue(
                            mockHealthInterest
                        )
                    prismaMock
                        .profileHealthInterest
                        .deleteMany
                        .mockResolvedValue({
                            count: 1
                        })
                    prismaMock
                        .profileHealthInterest
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
                            `${endpoint}/mental-health`
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )

                    expect(res.status).toBe(200)
                    expect(
                        res.body.message
                    ).toContain('removed')
                }
            )

            it(
                'should return 401 if not authenticated',
                async () => {
                    const res = await request(App)
                        .delete(
                            `${endpoint}/mental-health`
                        )

                    expect(res.status).toBe(401)
                }
            )

            it(
                'should validate slug parameter',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const slug = 'a'.repeat(51)

                    const res = await request(App)
                        .delete(`${endpoint}/${slug}`)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )

                    expect(res.status).toBe(403)
                }
            )
        }
    )

    // ==================== ACTIVITY PREFERENCES ====================
    describe(
        'POST /api/v1/profile/activities',
        () => {
            const endpoint =
                '/api/v1/profile/activities'

            it(
                'should add single activity preference',
                async () => {
                    prismaMock.activityPreference
                        .findUnique
                        .mockResolvedValue(
                            mockActivityPreference
                        )
                    prismaMock
                        .profileActivityPreference
                        .upsert.mockResolvedValue({
                        id: 'link-1',
                        profileId: mockProfile.id,
                        activityPreferenceId:
                            mockActivityPreference.id,
                        addedAt: new Date()
                    })
                    prismaMock
                        .profileActivityPreference
                        .findMany
                        .mockResolvedValue([{
                            profileId: mockProfile.id,
                            activityPreferenceId:
                                mockActivityPreference.id,
                            addedAt: new Date(),
                            activityPreference:
                                mockActivityPreference
                        }])
                    prismaMock
                        .profileHealthInterest
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
                        .post(endpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )
                        .send({
                            slugs: ['meditation']
                        })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.message
                    ).toContain('added')
                }
            )

            it(
                'should add multiple activities',
                async () => {
                    const activity2 = {
                        ...mockActivityPreference,
                        id: 'activity-2',
                        slug: 'yoga'
                    }

                    prismaMock.activityPreference
                        .findUnique
                        .mockResolvedValueOnce(
                            mockActivityPreference
                        )
                        .mockResolvedValueOnce(activity2)

                    prismaMock
                        .profileActivityPreference
                        .upsert
                        .mockResolvedValueOnce({
                            id: 'link-1',
                            profileId: mockProfile.id,
                            activityPreferenceId:
                                mockActivityPreference
                                    .id,
                            addedAt: new Date()
                        })
                        .mockResolvedValueOnce({
                            id: 'link-2',
                            profileId: mockProfile.id,
                            activityPreferenceId:
                                activity2.id,
                            addedAt: new Date()
                        })

                    prismaMock
                        .profileActivityPreference
                        .findMany
                        .mockResolvedValue([
                            {
                                profileId:
                                    mockProfile.id,
                                activityPreferenceId:
                                    mockActivityPreference
                                        .id,
                                addedAt: new Date(),
                                activityPreference:
                                    mockActivityPreference
                            },
                            {
                                profileId:
                                    mockProfile.id,
                                activityPreferenceId:
                                    activity2.id,
                                addedAt: new Date(),
                                activityPreference:
                                    activity2
                            }
                        ])
                    prismaMock
                        .profileHealthInterest
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
                        .post(endpoint)
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )
                        .send({
                            slugs: ['meditation', 'yoga']
                        })

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                            .activityPreferences
                    ).toHaveLength(2)
                }
            )

            it(
                'should return 401 if not authenticated',
                async () => {
                    const res = await request(App)
                        .post(endpoint)
                        .send({ slugs: ['meditation'] })

                    expect(res.status).toBe(401)
                }
            )

            it(
                'should reject missing slugs array',
                async () => {
                    const {
                        token,
                        csrfSecret,
                        csrfToken
                    } =
                        createAuthenticatedRequest(
                            mockUser
                        )

                    const res = await withCsrfAuth(
                        request(App).post(endpoint),
                        token,
                        csrfSecret,
                        csrfToken
                    ).send({})

                    expect(res.status).toBe(403)
                    expect(res.body.error).toBeDefined()
                }
            )
        }
    )

    describe(
        'DELETE /api/v1/profile/activities/:slug',
        () => {
            const endpoint =
                '/api/v1/profile/activities'

            it(
                'should remove activity preference',
                async () => {
                    prismaMock.activityPreference
                        .findUnique
                        .mockResolvedValue(
                            mockActivityPreference
                        )
                    prismaMock
                        .profileActivityPreference
                        .deleteMany
                        .mockResolvedValue({
                            count: 1
                        })
                    prismaMock
                        .profileActivityPreference
                        .findMany
                        .mockResolvedValue([])
                    prismaMock
                        .profileHealthInterest
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
                            `${endpoint}/meditation`
                        )
                        .set('Cookie', [
                            `accessToken=${token}`,
                            `_csrf=${csrfSecret}`
                        ])
                        .set(
                            'x-csrf-token',
                            csrfToken
                        )

                    expect(res.status).toBe(200)
                    expect(
                        res.body.message
                    ).toContain('removed')
                }
            )

            it(
                'should return 401 if not authenticated',
                async () => {
                    const res = await request(App)
                        .delete(`${endpoint}/meditation`)

                    expect(res.status).toBe(401)
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
                    const interests = [
                        mockHealthInterest,
                        {
                            ...mockHealthInterest,
                            id: 'health-2',
                            slug: 'fitness'
                        }
                    ]

                    prismaMock.healthInterest.findMany
                        .mockResolvedValue(interests)

                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                    ).toHaveLength(2)
                    expect(
                        res.body.data[0].slug
                    ).toBe('mental-health')
                    expect(
                        res.body.message
                    ).toContain('available')
                }
            )

            it(
                'should return empty array if no interests',
                async () => {
                    prismaMock.healthInterest.findMany
                        .mockResolvedValue([])

                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(res.body.data).toEqual([])
                }
            )

            it(
                'should be publicly accessible',
                async () => {
                    prismaMock.healthInterest.findMany
                        .mockResolvedValue([
                            mockHealthInterest
                        ])

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
                    const activities = [
                        mockActivityPreference,
                        {
                            ...mockActivityPreference,
                            id: 'activity-2',
                            slug: 'yoga'
                        }
                    ]

                    prismaMock.activityPreference
                        .findMany
                        .mockResolvedValue(activities)

                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(
                        res.body.data
                    ).toHaveLength(2)
                    expect(
                        res.body.data[0].slug
                    ).toBe('meditation')
                    expect(
                        res.body.message
                    ).toContain('available')
                }
            )

            it(
                'should return empty array if no activities',
                async () => {
                    prismaMock.activityPreference
                        .findMany
                        .mockResolvedValue([])

                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                    expect(res.body.data).toEqual([])
                }
            )

            it(
                'should be publicly accessible',
                async () => {
                    prismaMock.activityPreference
                        .findMany
                        .mockResolvedValue([
                            mockActivityPreference
                        ])

                    const res = await request(App)
                        .get(endpoint)

                    expect(res.status).toBe(200)
                }
            )
        }
    )
})