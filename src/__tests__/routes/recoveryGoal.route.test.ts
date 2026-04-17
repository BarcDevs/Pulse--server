// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import { errorFactory } from '../../errors/factory/ErrorFactory'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockMilestone,
    createMockRecoveryGoal,
    createMockUser,
    withBearerAuth,
    withCsrfAuth
} from '../setup/testSetup'

const API_BASE = '/api/v1/recovery-goals'

describe('Recovery Goals Routes', () => {
    beforeEach(() => {
        prismaMock.profile.findUnique
            .mockImplementation(async (args: any) => {
                const userId = args.where.userId
                const profileIdMap: {[key: string]: string} = {
                    'test-user-id-123': 'test-profile-id-123',
                    'other-user-id': 'other-profile-id-456'
                }
                const profileId = profileIdMap[userId] || 'test-profile-id-123'
                return {
                    id: profileId,
                    userId
                }
            })
    })

    // ==================== CREATE GOAL ====================
    describe('POST /api/v1/recovery-goals', () => {
        const endpoint = API_BASE
        const validBody = {
            title: 'Build a consistent sleep schedule',
            description: 'Establish a regular sleep routine for better recovery'
        }

        it(
            'should return 401 when posting goal without auth token',
            async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send(validBody)

            expect(response.status).toBe(401)
        })

        it(
            'should return 201 and create goal with title and description',
            async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.create.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send(validBody)

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('Goal created successfully')
            expect(response.body.data.title).toBe(validBody.title)
            expect(response.body.data.profileId).toBe('test-profile-id-123')
        })

        it('should allow optional description', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                userId: mockUser.id,
                description: null
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.create.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Simple Goal' })

            expect(response.status).toBe(201)
            expect(response.body.data.description).toBeNull()
        })

        it('should return 401 for missing CSRF token', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                token
            ).send(validBody)

            expect(response.status).toBe(401)
        })

        it('should return 403 for missing title', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ description: 'No title provided' })

            expect(response.status).toBe(403)
        })

        it(
            'should return 403 for title exceeding 150 characters',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)
                const longTitle = 'a'.repeat(151)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ title: longTitle })

                expect(response.status).toBe(403)
            })
    })

    // ==================== GET ALL GOALS ====================
    describe('GET /api/v1/recovery-goals', () => {
        const endpoint = API_BASE

        it('should return 200 and goals array', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoals = [
                createMockRecoveryGoal(),
                createMockRecoveryGoal({
                    id: 'goal-2',
                    userId: mockUser.id,
                    title: 'Another goal'
                })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue(mockGoals)

            const response = await withBearerAuth(
                supertest(App).get(endpoint),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toBeInstanceOf(Array)
            expect(response.body.data).toHaveLength(2)
            expect(response.body.message).toBe('Goals retrieved successfully')
        })

        it('should return 200 with empty array', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(endpoint),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toEqual([])
        })

        it(
            'should return 401 when getting goals list without auth token',
            async () => {
            const response = await supertest(App).get(endpoint)

            expect(response.status).toBe(401)
        })
    })

    // ==================== GET SINGLE GOAL ====================
    describe('GET /api/v1/recovery-goals/:goalId', () => {
        const goalId = 'test-goal-id-123'

        it('should return 200 and goal with milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                userId: mockUser.id,
                milestones: [
                    createMockMilestone(),
                    createMockMilestone({ id: 'm-2' })
                ]
            })

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/${goalId}`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.id).toBe(goalId)
            expect(response.body.data.milestones).toHaveLength(2)
        })

        it('should return 404 for non-existent goal', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/${goalId}`),
                token
            )

            expect(response.status).toBe(404)
            expect(response.body.message).toContain('not found')
        })

        it(
            'should return 401 when getting single goal without auth token',
            async () => {
            const response = await supertest(App).get(`${API_BASE}/${goalId}`)

            expect(response.status).toBe(401)
        })

        it(
            'should return 404 when goal belongs to different user',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

                const response = await withBearerAuth(
                    supertest(App).get(`${API_BASE}/${goalId}`),
                    token
                )

                expect(response.status).toBe(404)
            })
    })

    // ==================== UPDATE GOAL ====================
    describe('PATCH /api/v1/recovery-goals/:goalId', () => {
        const goalId = 'test-goal-id-123'
        const updateBody = { title: 'Updated Goal Title' }

        it('should return 200 and update goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                userId: mockUser.id,
                title: updateBody.title
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/${goalId}`),
                token,
                csrfSecret,
                csrfToken
            )
                .send(updateBody)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Goal updated successfully')
            expect(response.body.data.title).toBe(updateBody.title)
        })

        it('should allow updating description only', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                userId: mockUser.id,
                description: 'New description'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/${goalId}`),
                token,
                csrfSecret,
                csrfToken
            )
                .send({ description: 'New description' })

            expect(response.status).toBe(200)
        })

        it('should return 404 for non-existent goal', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/${goalId}`),
                token,
                csrfSecret,
                csrfToken
            )
                .send(updateBody)

            expect(response.status).toBe(404)
        })

        it('should return 401 for missing CSRF token', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).patch(`${API_BASE}/${goalId}`),
                token
            ).send(updateBody)

            expect(response.status).toBe(401)
        })
    })

    // ==================== DELETE GOAL ====================
    describe('DELETE /api/v1/recovery-goals/:goalId', () => {
        const goalId = 'test-goal-id-123'

        it(
            'should return 200 and delete goal (cascade to milestones)',
            async () => {
                const mockUser = createMockUser()
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id,
                    milestones: [
                        createMockMilestone()
                    ]
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.recoveryGoal.findFirst
                    .mockResolvedValue(mockGoal)
                prismaMock.recoveryGoal.delete
                    .mockResolvedValue(mockGoal)

                const response = await withCsrfAuth(
                    supertest(App)
                        .delete(`${API_BASE}/${goalId}`),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('Goal deleted successfully')
                expect(response.body.data).toBeNull()
            }
        )

        it('should return 404 for non-existent goal', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            const response = await withCsrfAuth(
                supertest(App).delete(`${API_BASE}/${goalId}`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(404)
        })

        it('should return 401 for missing CSRF token', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App)
                    .delete(`${API_BASE}/${goalId}`),
                token
            )

            expect(response.status).toBe(401)
        })
    })

    // ==================== CREATE MILESTONE ====================
    describe('POST /api/v1/recovery-goals/:goalId/milestones', () => {
        const goalId = 'test-goal-id-123'
        const validBody = { title: 'No screens 1 hour before bed' }

        it(
            'should return 201 and create milestone with auto-assigned order',
            async () => {
                const mockUser = createMockUser()
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const mockMilestone = createMockMilestone({
                    goalId
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.recoveryGoal.findFirst
                    .mockResolvedValue(mockGoal)

                // Mock the $transaction method used by
                // createMilestoneWithinTransaction
                prismaMock.$transaction
                    .mockImplementation(async (callback) => {
                        const txClient = {
                            recoveryGoal: {
                                findUnique: jest.fn()
                                    .mockResolvedValue(
                                        mockGoal
                                    )
                            },
                            milestone: {
                                count: jest.fn()
                                    .mockResolvedValue(0),
                                create: jest.fn()
                                    .mockResolvedValue(
                                        mockMilestone
                                    )
                            }
                        }
                        return callback(txClient)
                    })

                const response = await withCsrfAuth(
                    supertest(App)
                        .post(
                            `${API_BASE}/${goalId}/milestones`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send(validBody)

                expect(response.status).toBe(201)
                expect(response.body.message)
                    .toBe(
                        'Milestone created successfully'
                    )
                expect(response.body.data.title)
                    .toBe(validBody.title)
                expect(response.body.data.order).toBe(0)
            }
        )

        it(
            'should return 404 for non-existent goal',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.recoveryGoal.findFirst
                    .mockResolvedValue(null)

                const response = await withCsrfAuth(
                    supertest(App)
                        .post(
                            `${API_BASE}/${goalId}/milestones`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send(validBody)

                expect(response.status).toBe(404)
            }
        )

        it(
            'should return 409 when max 4 milestones exceeded',
            async () => {
                const mockUser = createMockUser()
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.recoveryGoal.findFirst
                    .mockResolvedValue(mockGoal)

                // Mock transaction to simulate
                // max milestones error
                prismaMock.$transaction
                    .mockImplementation(async () => {
                        throw errorFactory.generic
                            .conflict(
                                'Maximum 4 milestones per goal allowed'
                            )
                    })

                const response = await withCsrfAuth(
                    supertest(App)
                        .post(
                            `${API_BASE}/${goalId}/milestones`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send(validBody)

                expect(response.status).toBe(409)
            }
        )

        it(
            'should return 403 for missing title',
            async () => {
                const mockUser = createMockUser()
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.recoveryGoal.findFirst
                    .mockResolvedValue(mockGoal)

                const response = await withCsrfAuth(
                    supertest(App)
                        .post(
                            `${API_BASE}/${goalId}/milestones`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({})

                expect(response.status).toBe(403)
            }
        )

        it('should return 401 for missing CSRF token', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App)
                    .post(
                        `${API_BASE}/${goalId}/milestones`
                    ),
                token
            ).send(validBody)

            expect(response.status).toBe(401)
        })
    })

    // ==================== UPDATE MILESTONE ====================
    describe(
        'PATCH /api/v1/recovery-goals/:goalId/milestones/:milestoneId',
        () => {
        const goalId = 'test-goal-id-123'
        const milestoneId = 'test-milestone-id-123'

        it(
            'should return 200 and toggle isCompleted',
            async () => {
                const mockUser = createMockUser()
                const mockMilestone = createMockMilestone({
                    goalId,
                    isCompleted: true
                })
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue({
                        ...mockMilestone,
                        goal: mockGoal
                    })
                prismaMock.milestone.update
                    .mockResolvedValue(mockMilestone)

                const response = await withCsrfAuth(
                    supertest(App)
                        .patch(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ isCompleted: true })

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('Milestone updated successfully')
                expect(response.body.data.isCompleted)
                    .toBe(true)
            }
        )

        it(
            'should return 200 and update title',
            async () => {
                const mockUser = createMockUser()
                const mockMilestone = createMockMilestone({
                    goalId,
                    title: 'Updated title'
                })
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue({
                        ...mockMilestone,
                        goal: mockGoal
                    })
                prismaMock.milestone.update
                    .mockResolvedValue(mockMilestone)

                const response = await withCsrfAuth(
                    supertest(App)
                        .patch(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ title: 'Updated title' })

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 404 for non-existent milestone',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue(null)

                const response = await withCsrfAuth(
                    supertest(App)
                        .patch(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ isCompleted: true })

                expect(response.status).toBe(404)
            }
        )

        it(
            'should return 401 when milestone belongs to different user',
            async () => {
                const mockUser = createMockUser()
                const mockMilestone = createMockMilestone({
                    goalId
                })
                const otherUsersGoal =
                    createMockRecoveryGoal({
                        profileId: 'other-profile-id-456'
                    })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue({
                        ...mockMilestone,
                        goal: otherUsersGoal
                    })

                const response = await withCsrfAuth(
                    supertest(App)
                        .patch(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ isCompleted: true })

                expect(response.status).toBe(401)
            }
        )
    })

    // ==================== DELETE MILESTONE ====================
    describe(
        'DELETE /api/v1/recovery-goals/:goalId/milestones/:milestoneId',
        () => {
        const goalId = 'test-goal-id-123'
        const milestoneId = 'test-milestone-id-123'

        it(
            'should return 200 and delete milestone',
            async () => {
                const mockUser = createMockUser()
                const mockMilestone = createMockMilestone({
                    goalId
                })
                const mockGoal = createMockRecoveryGoal({
                    userId: mockUser.id
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue({
                        ...mockMilestone,
                        goal: mockGoal
                    })
                prismaMock.milestone.delete
                    .mockResolvedValue(mockMilestone)

                const response = await withCsrfAuth(
                    supertest(App)
                        .delete(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('Milestone deleted successfully')
                expect(response.body.data).toBeNull()
            }
        )

        it(
            'should return 404 for non-existent milestone',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue(null)

                const response = await withCsrfAuth(
                    supertest(App)
                        .delete(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(404)
            }
        )

        it(
            'should return 401 when milestone belongs to different user',
            async () => {
                const mockUser = createMockUser()
                const mockMilestone = createMockMilestone({
                    goalId
                })
                const otherUsersGoal =
                    createMockRecoveryGoal({
                        profileId: 'other-profile-id-456'
                    })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.milestone.findUnique
                    .mockResolvedValue({
                        ...mockMilestone,
                        goal: otherUsersGoal
                    })

                const response = await withCsrfAuth(
                    supertest(App)
                        .delete(
                            `${API_BASE}/${goalId}/milestones/${milestoneId}`
                        ),
                    token,
                    csrfSecret,
                    csrfToken
                )

                expect(response.status).toBe(401)
            }
        )
    })
})
