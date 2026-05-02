// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import { MAX_ACTIVE_GOALS } from '../../config/recoveryGoals'
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
        jest.clearAllMocks()
        prismaMock.profile.findUnique
            .mockImplementation(async (args: any) => {
                const userId = args.where.userId
                const profileIdMap: { [key: string]: string } = {
                    'test-user-id-123': 'test-profile-id-123',
                    'other-user-id': 'other-profile-id-456'
                }
                const profileId = profileIdMap[userId] || 'test-profile-id-123'
                return {
                    id: profileId,
                    userId
                }
            })
        prismaMock.recoveryGoal.findMany.mockResolvedValue([])
        prismaMock.recoveryGoal.create.mockResolvedValue({} as any)
        prismaMock.recoveryGoal.findFirst.mockResolvedValue({
            id: 'test-goal-id-123',
            profileId: 'test-profile-id-123',
            title: 'Test Goal',
            description: null,
            category: 'physical',
            isPrimary: false,
            status: 'ACTIVE',
            targetDate: null,
            createdAt: new Date(),
            updatedAt: new Date()
        } as any)
        prismaMock.recoveryGoal.update.mockResolvedValue({} as any)
        prismaMock.recoveryGoal.delete.mockResolvedValue({} as any)
        prismaMock.milestone.findMany.mockResolvedValue([])
        prismaMock.milestone.create.mockResolvedValue({} as any)
        prismaMock.milestone.findFirst.mockResolvedValue({
            id: 'test-milestone-id-123',
            goalId: 'test-goal-id-123',
            title: 'Test Milestone',
            description: null,
            status: 'ACTIVE',
            order: 0,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        } as any)
        prismaMock.milestone.update.mockResolvedValue({} as any)
        prismaMock.milestone.delete.mockResolvedValue({} as any)
        prismaMock.milestone.count.mockResolvedValue(0)
        prismaMock.milestone.aggregate.mockResolvedValue({
            _max: { order: null }
        })
        prismaMock.milestone.findUnique.mockResolvedValue(null)
    })

    // ==================== CREATE GOAL ====================
    describe('POST /api/v1/recovery-goals', () => {
        const endpoint = API_BASE

        it('should create goal with all fields', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                profileId: 'test-profile-id-123',
                title: 'Build strength',
                description: 'Physical recovery goal',
                category: 'physical',
                isPrimary: true,
                status: 'active',
                targetDate: new Date('2026-07-23')
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
            ).send({
                title: 'Build strength',
                description: 'Physical recovery goal',
                category: 'physical',
                isPrimary: true,
                targetDate: '2026-07-23T00:00:00Z'
            })

            expect(response.status).toBe(201)
            expect(response.body.data.title).toBe('Build strength')
            expect(response.body.data.category).toBe('physical')
            expect(response.body.data.isPrimary).toBe(true)
            expect(response.body.data.progress).toBe(0)
        })

        it('should create goal with minimal fields', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                title: 'Simple goal',
                category: 'mental'
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
            ).send({
                title: 'Simple goal',
                category: 'mental'
            })

            expect(response.status).toBe(201)
            expect(response.body.data.isPrimary).toBe(false)
            expect(response.body.data.status).toBe('active')
        })

        it('should reject missing title', async () => {
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
            ).send({ category: 'physical' })

            expect(response.status).toBe(400)
        })

        it('should reject invalid category', async () => {
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
            ).send({
                title: 'Goal',
                category: 'invalid'
            })

            expect(response.status).toBe(400)
        })

        it('should require auth', async () => {
            const response = await supertest(App)
                .post(endpoint)
                .send({
                    title: 'Goal',
                    category: 'physical'
                })

            expect(response.status).toBe(401)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).post(endpoint),
                token
            ).send({
                title: 'Goal',
                category: 'physical'
            })

            expect(response.status).toBe(401)
        })

        it('should reject creation when exceeding active goals limit', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const activeGoals = Array.from({ length: MAX_ACTIVE_GOALS }).map(
                (_, i) =>
                    createMockRecoveryGoal({
                        id: `goal-${i}`,
                        profileId: 'test-profile-id-123',
                        status: 'active'
                    })
            )

            prismaMock.recoveryGoal.findMany.mockResolvedValueOnce(
                activeGoals
            )

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'New Goal',
                category: 'physical'
            })

            expect(response.status).toBe(409)
        })

        it('should allow creation when goals are completed', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const completedGoals = Array.from({ length: 5 }).map(
                (_, i) =>
                    createMockRecoveryGoal({
                        id: `goal-${i}`,
                        profileId: 'test-profile-id-123',
                        status: 'completed'
                    })
            )
            const newGoal = createMockRecoveryGoal({
                profileId: 'test-profile-id-123',
                title: 'New Goal',
                category: 'physical'
            })

            prismaMock.recoveryGoal.findMany.mockResolvedValueOnce(
                completedGoals
            )
            prismaMock.recoveryGoal.create.mockResolvedValueOnce(newGoal)

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'New Goal',
                category: 'physical'
            })

            expect(response.status).toBe(201)
            expect(response.body.data.title).toBe('New Goal')
        })

        it('should allow creation when goals are abandoned', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const abandonedGoals = Array.from({ length: 5 }).map(
                (_, i) =>
                    createMockRecoveryGoal({
                        id: `goal-${i}`,
                        profileId: 'test-profile-id-123',
                        status: 'abandoned'
                    })
            )
            const newGoal = createMockRecoveryGoal({
                profileId: 'test-profile-id-123',
                title: 'New Goal',
                category: 'mental'
            })

            prismaMock.recoveryGoal.findMany.mockResolvedValueOnce(
                abandonedGoals
            )
            prismaMock.recoveryGoal.create.mockResolvedValueOnce(newGoal)

            const response = await withCsrfAuth(
                supertest(App).post(endpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'New Goal',
                category: 'mental'
            })

            expect(response.status).toBe(201)
            expect(response.body.data.title).toBe('New Goal')
        })
    })

    // ==================== GET ALL GOALS ====================
    describe('GET /api/v1/recovery-goals', () => {
        it('should return goals with progress', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoals = [
                createMockRecoveryGoal({
                    id: 'goal-1',
                    title: 'Goal 1'
                }),
                createMockRecoveryGoal({
                    id: 'goal-2',
                    title: 'Goal 2'
                })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue(mockGoals)
            prismaMock.milestone.count.mockResolvedValue(0)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toHaveLength(2)
            expect(response.body.data[0]).toHaveProperty('progress')
        })

        it('should return empty array', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toEqual([])
        })

        it('should require auth', async () => {
            const response = await supertest(App).get(API_BASE)
            expect(response.status).toBe(401)
        })
    })

    // ==================== GET SINGLE GOAL ====================
    describe('GET /api/v1/recovery-goals/:goalId', () => {
        it('should return goal with milestones and progress', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                profileId: 'test-profile-id-123'
            })
            const mockMilestones = [
                createMockMilestone({ status: 'active' }),
                createMockMilestone({
                    id: 'm-2',
                    status: 'locked'
                })
            ]

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/goal-123`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goal.id).toBe('goal-123')
            expect(response.body.data.milestones).toHaveLength(2)
            expect(response.body.data.goal).toHaveProperty('progress')
        })

        it('should return 404 for non-existent goal', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/nonexistent`),
                token
            )

            expect(response.status).toBe(404)
        })

        it('should require auth', async () => {
            const response = await supertest(App).get(`${API_BASE}/goal-123`)
            expect(response.status).toBe(401)
        })
    })

    // ==================== UPDATE GOAL ====================
    describe('PATCH /api/v1/recovery-goals/:goalId', () => {
        it('should update goal fields', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                title: 'Updated title',
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated title' })

            expect(response.status).toBe(200)
            expect(response.body.data.title).toBe('Updated title')
        })

        it('should handle status update to abandoned', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: 'abandoned'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])
            prismaMock.milestone.updateMany.mockResolvedValue({
                count: 0
            })

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: 'abandoned' })

            expect(response.status).toBe(200)
        })

        it('should reject invalid status', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: 'invalid' })

            expect(response.status).toBe(400)
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
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated' })

            expect(response.status).toBe(404)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token
            ).send({ title: 'Updated' })

            expect(response.status).toBe(401)
        })
    })

    // ==================== DELETE GOAL ====================
    describe('DELETE /api/v1/recovery-goals/:goalId', () => {
        it('should delete goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.recoveryGoal.delete.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).delete(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toBeNull()
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
                supertest(App).delete(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(404)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).delete(`${API_BASE}/goal-123`),
                token
            )

            expect(response.status).toBe(401)
        })
    })

    // ==================== CREATE MILESTONES ====================
    describe('POST /api/v1/recovery-goals/:goalId/milestones', () => {
        it('should create single milestone with auto-increment order', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                order: 1,
                status: 'active',
                title: 'No screens 1 hour before bed',
                description: null
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.aggregate.mockResolvedValue({
                _max: { order: 0 }
            })
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    $executeRaw: jest.fn(),
                    milestone: {
                        count: jest.fn().mockResolvedValue(0),
                        create: jest.fn().mockResolvedValue(mockMilestone)
                    },
                    recoveryGoal: {
                        findUnique: jest.fn()
                            .mockResolvedValue(mockGoal)
                    }
                }
                return callback(tx)
            })

            const response = await withCsrfAuth(
                supertest(App).post(`${API_BASE}/goal-123/milestones`),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'No screens 1 hour before bed'
            })

            expect(response.status).toBe(201)
            expect(response.body.data).toHaveLength(1)
            expect(response.body.data[0].title).toBe('No screens 1 hour before bed')
            expect(response.body.data[0].order).toBe(1)
        })

        it('should create milestone with description', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                order: 1,
                status: 'active',
                title: 'First milestone',
                description: 'First step'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.aggregate.mockResolvedValue({
                _max: { order: 0 }
            })
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    $executeRaw: jest.fn(),
                    milestone: {
                        count: jest.fn().mockResolvedValue(0),
                        create: jest.fn().mockResolvedValue(mockMilestone)
                    },
                    recoveryGoal: {
                        findUnique: jest.fn()
                            .mockResolvedValue(mockGoal)
                    }
                }
                return callback(tx)
            })

            const response = await withCsrfAuth(
                supertest(App).post(`${API_BASE}/goal-123/milestones`),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'First milestone',
                description: 'First step'
            })

            expect(response.status).toBe(201)
            expect(response.body.data).toHaveLength(1)
            expect(response.body.data[0].title).toBe('First milestone')
            expect(response.body.data[0].description).toBe('First step')
        })

        it('should reject non-active goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                profileId: 'test-profile-id-123',
                status: 'paused'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockReset()
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.aggregate.mockResolvedValue({
                _max: { order: 0 }
            })

            const response = await withCsrfAuth(
                supertest(App).post(`${API_BASE}/goal-123/milestones`),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'Milestone'
            })

            expect(response.status).toBe(409)
        })

        it('should reject max 8 milestones', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.aggregate.mockResolvedValue({
                _max: { order: 8 }
            })
            prismaMock.$transaction.mockImplementation(async () => {
                throw errorFactory.generic.conflict(
                    'Maximum 8 milestones per goal'
                )
            })

            const response = await withCsrfAuth(
                supertest(App).post(`${API_BASE}/goal-123/milestones`),
                token,
                csrfSecret,
                csrfToken
            ).send({
                title: 'M9'
            })

            expect(response.status).toBe(409)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).post(`${API_BASE}/goal-123/milestones`),
                token
            ).send({
                title: 'Milestone'
            })

            expect(response.status).toBe(401)
        })
    })

    // ==================== UPDATE MILESTONE ====================
    describe('PATCH /api/v1/recovery-goals/:goalId/milestones/:milestoneId', () => {
        it('should update milestone title', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                id: 'm-123',
                title: 'Updated title',
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.milestone.update.mockResolvedValue(mockMilestone)

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated title' })

            expect(response.status).toBe(200)
            expect(response.body.data.title).toBe('Updated title')
        })

        it('should update description', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                description: 'Updated description'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.milestone.update.mockResolvedValue(mockMilestone)

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ description: 'Updated description' })

            expect(response.status).toBe(200)
        })

        it('should update order', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                order: 3
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.milestone.update.mockResolvedValue(mockMilestone)

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ order: 3 })

            expect(response.status).toBe(200)
        })

        it('should reject non-active goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                profileId: 'test-profile-id-123',
                status: 'completed'
            })
            const mockMilestone = createMockMilestone()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.recoveryGoal.findFirst.mockReset()
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated' })

            expect(response.status).toBe(409)
        })

        it('should reject modification of completed milestone', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                status: 'completed'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated' })

            expect(response.status).toBe(409)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App)
                    .patch(`${API_BASE}/goal-123/milestones/m-123`),
                token
            ).send({ title: 'Updated' })

            expect(response.status).toBe(401)
        })
    })

    // ==================== DELETE MILESTONE ====================
    describe('DELETE /api/v1/recovery-goals/:goalId/milestones/:milestoneId', () => {
        it('should delete milestone', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const mockMilestone = createMockMilestone()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.milestone.delete.mockResolvedValue(mockMilestone)

            const response = await withCsrfAuth(
                supertest(App)
                    .delete(`${API_BASE}/goal-123/milestones/m-123`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toBeNull()
        })

        it('should require auth', async () => {
            const response = await supertest(App)
                .delete(`${API_BASE}/goal-123/milestones/m-123`)

            expect(response.status).toBe(401)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App)
                    .delete(`${API_BASE}/goal-123/milestones/m-123`),
                token
            )

            expect(response.status).toBe(401)
        })
    })

    // ==================== COMPLETE MILESTONE ====================
    describe('PATCH /api/v1/recovery-goals/:goalId/milestones/:milestoneId/complete', () => {
        it('should complete milestone and advance next', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                profileId: 'test-profile-id-123',
                status: 'active'
            })
            const mockMilestone = createMockMilestone({
                id: 'm-1',
                order: 1,
                status: 'ACTIVE'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })
            prismaMock.recoveryGoal.findFirst.mockReset()
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.$transaction.mockImplementation(async (callback) => {
                return callback({
                    $executeRaw: jest.fn().mockResolvedValue(undefined),
                    milestone: {
                        findUnique: jest.fn()
                            .mockResolvedValue(mockMilestone),
                        update: jest.fn()
                            .mockResolvedValue({
                                ...mockMilestone,
                                status: 'COMPLETED'
                            }),
                        findFirst: jest.fn()
                            .mockResolvedValue({
                                id: 'm-2',
                                status: 'LOCKED'
                            })
                    },
                    recoveryGoal: {
                        update: jest.fn()
                    }
                })
            })

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(
                        `${API_BASE}/goal-123/milestones/m-123/complete`
                    ),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(200)
            expect(response.body.message)
                .toContain('completed successfully')
        })

        it('should reject non-active goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'paused'
            })
            const mockMilestone = createMockMilestone()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.milestone.findUnique.mockResolvedValue({
                ...mockMilestone,
                goal: mockGoal
            })

            const response = await withCsrfAuth(
                supertest(App)
                    .patch(
                        `${API_BASE}/goal-123/milestones/m-123/complete`
                    ),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(409)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App)
                    .patch(
                        `${API_BASE}/goal-123/milestones/m-123/complete`
                    ),
                token
            )

            expect(response.status).toBe(401)
        })
    })

    // ==================== COMPLETE GOAL ====================
    describe('PATCH /api/v1/recovery-goals/:goalId/complete', () => {
        it('should complete goal', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ status: 'completed' }),
                createMockMilestone({
                    id: 'm-2',
                    status: 'completed'
                })
            ])
            prismaMock.recoveryGoal.update.mockResolvedValue({
                ...mockGoal,
                status: 'completed'
            })

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe('completed')
            expect(response.body.data.progress).toBe(1)
        })

        it('should reject if goal not active', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'paused'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(409)
        })

        it('should reject if milestones incomplete', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ status: 'completed' }),
                createMockMilestone({
                    id: 'm-2',
                    status: 'active'
                })
            ])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(409)
        })

        it('should reject if no milestones', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: 'active'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(409)
        })

        it('should require CSRF', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await withBearerAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token
            )

            expect(response.status).toBe(401)
        })
    })
})
