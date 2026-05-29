// @ts-nocheck
import supertest from 'supertest'

import {
    GoalStatus,
    MilestoneStatus
} from '../../../prisma/generated/prisma/enums'
import App from '../../app'
import { recoveryGoalsConfig } from '../../config/recoveryGoals'
import { dayInMs } from '../../constants/time'
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
            status: GoalStatus.ACTIVE,
            targetDate: null,
            pausedAt: null,
            completedAt: null,
            abandonedAt: null,
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
            status: MilestoneStatus.ACTIVE,
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
                status: GoalStatus.ACTIVE,
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
            expect(response.body.data.status).toBe(GoalStatus.ACTIVE)
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

            const activeGoals = Array.from({ length: recoveryGoalsConfig.maxActiveGoals }).map(
                (_, i) =>
                    createMockRecoveryGoal({
                        id: `goal-${i}`,
                        profileId: 'test-profile-id-123',
                        status: GoalStatus.ACTIVE
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
                        status: GoalStatus.COMPLETED
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
                        status: GoalStatus.ABANDONED
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

        it('should return only goals matching ?status=ACTIVE', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-active',
                status: GoalStatus.ACTIVE
            })

            prismaMock.recoveryGoal.findMany.mockResolvedValue([activeGoal])
            prismaMock.milestone.count.mockResolvedValue(0)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}?status=ACTIVE`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toHaveLength(1)
            expect(response.body.data[0].status).toBe(GoalStatus.ACTIVE)
            expect(prismaMock.recoveryGoal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: GoalStatus.ACTIVE
                    })
                })
            )
        })

        it('should accept lowercase status param', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}?status=active`),
                token
            )

            expect(response.status).toBe(200)
            expect(prismaMock.recoveryGoal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: GoalStatus.ACTIVE
                    })
                })
            )
        })

        it('should return all goals when no status param', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const goals = [
                createMockRecoveryGoal({ id: 'g1', status: GoalStatus.ACTIVE }),
                createMockRecoveryGoal({ id: 'g2', status: GoalStatus.COMPLETED })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue(goals)
            prismaMock.milestone.count.mockResolvedValue(0)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data).toHaveLength(2)
            expect(prismaMock.recoveryGoal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.not.objectContaining({ status: expect.anything() })
                })
            )
        })

        it('should include milestonesCount: 0 when goal has no milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({ id: 'goal-1' })

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(0)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].milestonesCount).toBe(0)
        })

        it('should include correct milestonesCount when goal has milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({ id: 'goal-1' })
            const mockMilestones = [
                createMockMilestone({ id: 'm-1', status: MilestoneStatus.COMPLETED }),
                createMockMilestone({ id: 'm-2', status: MilestoneStatus.ACTIVE }),
                createMockMilestone({ id: 'm-3', status: MilestoneStatus.LOCKED })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(3)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].milestonesCount).toBe(3)
        })

        it('should include nextMilestone title for ACTIVE goal with active milestone', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-1',
                status: GoalStatus.ACTIVE
            })
            const mockMilestones = [
                createMockMilestone({
                    id: 'm-1',
                    title: 'First milestone',
                    status: MilestoneStatus.COMPLETED
                }),
                createMockMilestone({
                    id: 'm-2',
                    title: 'Current milestone',
                    status: MilestoneStatus.ACTIVE
                }),
                createMockMilestone({
                    id: 'm-3',
                    title: 'Locked milestone',
                    status: MilestoneStatus.LOCKED
                })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(3)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].nextMilestone).toBe('Current milestone')
        })

        it('should include nextMilestone null for ACTIVE goal with no milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-1',
                status: GoalStatus.ACTIVE
            })

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(0)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].nextMilestone).toBeNull()
        })

        it('should include nextMilestone title for ACTIVE goal with only locked milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-1',
                status: GoalStatus.ACTIVE
            })
            const mockMilestones = [
                createMockMilestone({
                    id: 'm-1',
                    title: 'Locked milestone',
                    status: MilestoneStatus.LOCKED
                })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(1)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].nextMilestone).toBe('Locked milestone')
        })

        it('should include nextMilestone null for non-ACTIVE goal', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-1',
                status: GoalStatus.PAUSED
            })
            const mockMilestones = [
                createMockMilestone({
                    id: 'm-1',
                    title: 'Locked milestone',
                    status: MilestoneStatus.LOCKED
                })
            ]

            prismaMock.recoveryGoal.findMany.mockResolvedValue([mockGoal])
            prismaMock.milestone.count.mockResolvedValue(1)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(API_BASE),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data[0].nextMilestone).toBeNull()
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
                createMockMilestone({ status: MilestoneStatus.ACTIVE }),
                createMockMilestone({
                    id: 'm-2',
                    status: MilestoneStatus.LOCKED
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

        it('should include nextMilestone title for ACTIVE goal with active milestone', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const mockMilestones = [
                createMockMilestone({
                    id: 'm-1',
                    title: 'Done milestone',
                    status: MilestoneStatus.COMPLETED
                }),
                createMockMilestone({
                    id: 'm-2',
                    title: 'Active milestone',
                    status: MilestoneStatus.ACTIVE
                })
            ]

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/goal-123`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goal.nextMilestone).toBe('Active milestone')
        })

        it('should include nextMilestone title for ACTIVE goal with only locked milestone', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const mockMilestones = [
                createMockMilestone({
                    id: 'm-1',
                    title: 'Locked milestone',
                    status: MilestoneStatus.LOCKED
                })
            ]

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/goal-123`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goal.nextMilestone).toBe('Locked milestone')
        })

        it('should include nextMilestone null when goal has no milestones', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const mockGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/goal-123`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goal.nextMilestone).toBeNull()
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
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.ABANDONED
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
            ).send({ status: GoalStatus.ABANDONED })

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

        it('should pause an active goal', async () => {
            const mockUser = createMockUser()
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const pausedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.PAUSED,
                pausedAt: new Date()
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(activeGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(pausedGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.PAUSED })

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe(GoalStatus.PAUSED)
            expect(response.body.data.pausedAt).not.toBeNull()
        })

        it('should resume a paused goal', async () => {
            const mockUser = createMockUser()
            const pausedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.PAUSED,
                pausedAt: new Date()
            })
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(pausedGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(activeGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.ACTIVE })

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe(GoalStatus.ACTIVE)
        })

        it('should restore an abandoned goal and activate first locked milestone', async () => {
            const mockUser = createMockUser()
            const abandonedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ABANDONED,
                abandonedAt: new Date()
            })
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(abandonedGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(activeGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])
            prismaMock.milestone.findFirst.mockResolvedValue({
                id: 'm-1',
                goalId: 'goal-123',
                status: MilestoneStatus.LOCKED,
                order: 1
            } as any)
            prismaMock.milestone.update.mockResolvedValue({} as any)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.ACTIVE })

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe(GoalStatus.ACTIVE)
        })

        it('should reject any transition from a completed goal', async () => {
            const mockUser = createMockUser()
            const completedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.COMPLETED,
                completedAt: new Date()
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(completedGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.ACTIVE })

            expect(response.status).toBe(409)
        })

        it('should reject invalid transition PAUSED→COMPLETED', async () => {
            const mockUser = createMockUser()
            const pausedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.PAUSED
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(pausedGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.COMPLETED })

            expect(response.status).toBe(409)
        })

        it('should reject invalid transition COMPLETED→ABANDONED', async () => {
            const mockUser = createMockUser()
            const completedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.COMPLETED
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(completedGoal)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.ABANDONED })

            expect(response.status).toBe(409)
        })

        it('should reject ACTIVE→COMPLETED when milestones are incomplete', async () => {
            const mockUser = createMockUser()
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(activeGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                createMockMilestone({ id: 'm-2', status: MilestoneStatus.ACTIVE })
            ])

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.COMPLETED })

            expect(response.status).toBe(409)
        })

        it('should set abandonedAt when abandoning a paused goal', async () => {
            const mockUser = createMockUser()
            const pausedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.PAUSED
            })
            const abandonedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ABANDONED,
                abandonedAt: new Date()
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(pausedGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(abandonedGoal)
            prismaMock.milestone.findMany.mockResolvedValue([])
            prismaMock.milestone.updateMany.mockResolvedValue({ count: 0 })

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.ABANDONED })

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe(GoalStatus.ABANDONED)
            expect(response.body.data.abandonedAt).not.toBeNull()
        })

        it('should include nextMilestone for ACTIVE goal after update', async () => {
            const mockUser = createMockUser()
            const activeGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.ACTIVE
            })
            const mockMilestones = [
                createMockMilestone({ id: 'm-1', title: 'First milestone', status: MilestoneStatus.ACTIVE })
            ]
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(activeGoal)
            prismaMock.recoveryGoal.update.mockResolvedValue(activeGoal)
            prismaMock.milestone.findMany.mockResolvedValue(mockMilestones)

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ title: 'Updated title' })

            expect(response.status).toBe(200)
            expect(response.body.data.nextMilestone).toBe('First milestone')
        })

        it('should return null nextMilestone for PAUSED goal after update', async () => {
            const mockUser = createMockUser()
            const pausedGoal = createMockRecoveryGoal({
                id: 'goal-123',
                status: GoalStatus.PAUSED,
                pausedAt: new Date()
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(
                createMockRecoveryGoal({ id: 'goal-123', status: GoalStatus.ACTIVE })
            )
            prismaMock.recoveryGoal.update.mockResolvedValue(pausedGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ id: 'm-1', title: 'Some milestone', status: MilestoneStatus.ACTIVE })
            ])
            prismaMock.milestone.updateMany.mockResolvedValue({ count: 1 })

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123`),
                token,
                csrfSecret,
                csrfToken
            ).send({ status: GoalStatus.PAUSED })

            expect(response.status).toBe(200)
            expect(response.body.data.nextMilestone).toBeNull()
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
                status: GoalStatus.ACTIVE
            })
            const mockMilestone = createMockMilestone({
                order: 1,
                status: GoalStatus.ACTIVE,
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
                status: GoalStatus.ACTIVE
            })
            const mockMilestone = createMockMilestone({
                order: 1,
                status: GoalStatus.ACTIVE,
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
                status: GoalStatus.PAUSED
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
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.ACTIVE
            })
            const mockMilestone = createMockMilestone({
                id: 'm-123',
                title: 'Updated title',
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.COMPLETED
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
                status: GoalStatus.ACTIVE
            })
            const mockMilestone = createMockMilestone({
                status: GoalStatus.COMPLETED
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
                status: GoalStatus.ACTIVE
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
                status: GoalStatus.ACTIVE
            })
            const mockMilestone = createMockMilestone({
                id: 'm-1',
                order: 1,
                status: GoalStatus.ACTIVE
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
                                status: GoalStatus.COMPLETED
                            }),
                        findFirst: jest.fn()
                            .mockResolvedValue({
                                id: 'm-2',
                                status: MilestoneStatus.LOCKED
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
                status: GoalStatus.PAUSED
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
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)

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
                status: GoalStatus.ACTIVE
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ status: GoalStatus.COMPLETED }),
                createMockMilestone({
                    id: 'm-2',
                    status: GoalStatus.COMPLETED
                })
            ])
            prismaMock.recoveryGoal.update.mockResolvedValue({
                ...mockGoal,
                status: GoalStatus.COMPLETED
            })

            const response = await withCsrfAuth(
                supertest(App).patch(`${API_BASE}/goal-123/complete`),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(200)
            expect(response.body.data.status).toBe(GoalStatus.COMPLETED)
            expect(response.body.data.progress).toBe(1)
        })

        it('should reject if goal not active', async () => {
            const mockUser = createMockUser()
            const mockGoal = createMockRecoveryGoal({
                status: GoalStatus.PAUSED
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
                status: GoalStatus.ACTIVE
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.recoveryGoal.findFirst.mockResolvedValue(mockGoal)
            prismaMock.milestone.findMany.mockResolvedValue([
                createMockMilestone({ status: GoalStatus.COMPLETED }),
                createMockMilestone({
                    id: 'm-2',
                    status: GoalStatus.ACTIVE
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
                status: GoalStatus.ACTIVE
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

    describe('GET /api/v1/recovery-goals/stats', () => {
        it('should return stats for authenticated user with no filters', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.count.mockResolvedValue(10)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([
                { category: 'PHYSICAL', _count: 4 },
                { category: 'MENTAL', _count: 3 },
                { category: 'LIFESTYLE', _count: 3 }
            ] as any)
            prismaMock.milestone.count.mockResolvedValue(20)
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/stats`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals).toHaveProperty('totalCreated')
            expect(response.body.data.goals).toHaveProperty('completed')
            expect(response.body.data.goals).toHaveProperty('completionRate')
            expect(response.body.data.goals).toHaveProperty('streak')
            expect(response.body.data.goals).toHaveProperty('active')
            expect(response.body.data.goals).toHaveProperty('paused')
            expect(response.body.data.goals).toHaveProperty('byCategory')
            expect(response.body.data.milestones).toHaveProperty('totalCreated')
            expect(response.body.data.milestones).toHaveProperty('completed')
            expect(response.body.data.milestones).toHaveProperty('completionRate')
        })

        it('should return zero stats for fresh user', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.count.mockResolvedValue(0)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([])
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/stats`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals.totalCreated).toBe(0)
            expect(response.body.data.goals.completed).toBe(0)
            expect(response.body.data.goals.completionRate).toBe(0)
            expect(response.body.data.goals.streak).toBe(0)
        })

        it('should filter stats by date range', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.count.mockResolvedValue(5)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([])
            prismaMock.milestone.count.mockResolvedValue(10)
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App)
                    .get(`${API_BASE}/stats`)
                    .query({
                        fromDate: '2026-01-01T00:00:00Z',
                        toDate: '2026-03-31T23:59:59Z'
                    }),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals.totalCreated).toBe(5)
        })

        it('should filter stats by category', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.count.mockResolvedValue(4)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([
                { category: 'PHYSICAL', _count: 4 }
            ] as any)
            prismaMock.milestone.count.mockResolvedValue(8)
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App)
                    .get(`${API_BASE}/stats`)
                    .query({ category: 'PHYSICAL' }),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals.totalCreated).toBe(4)
        })

        it('should require authentication', async () => {
            const response = await supertest(App).get(`${API_BASE}/stats`)

            expect(response.status).toBe(401)
        })

        it('should calculate streak for consecutive days', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)
            const today = new Date()
            const yesterday = new Date(today.getTime() - dayInMs)

            prismaMock.recoveryGoal.count.mockResolvedValue(2)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([])
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.recoveryGoal.findMany.mockResolvedValue([
                { completedAt: today },
                { completedAt: yesterday }
            ] as any)
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/stats`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals.streak).toBeGreaterThan(0)
        })

        it('should calculate completion rate correctly', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            prismaMock.recoveryGoal.count
                .mockResolvedValueOnce(10) // totalCreated
                .mockResolvedValueOnce(3) // completed
                .mockResolvedValueOnce(6) // active
                .mockResolvedValueOnce(1) // paused
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([])
            prismaMock.milestone.count
                .mockResolvedValueOnce(20) // totalCreated
                .mockResolvedValueOnce(8) // completed
                .mockResolvedValueOnce(10) // active
                .mockResolvedValueOnce(2) // paused
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const response = await withBearerAuth(
                supertest(App).get(`${API_BASE}/stats`),
                token
            )

            expect(response.status).toBe(200)
            expect(response.body.data.goals.completionRate).toBe(0.3)
            expect(response.body.data.milestones.completionRate).toBe(0.4)
        })
    })
})
