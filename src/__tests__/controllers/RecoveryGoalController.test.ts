// @ts-nocheck
import type { Request, Response } from 'express'

import * as recoveryGoalController from '../../controllers/recoveryGoalController'
import * as recoveryGoalService from '../../services/recoveryGoalService'
import {
    createMockMilestone,
    createMockRecoveryGoal,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../services/recoveryGoalService')

const USER_ID = 'user-id-123'
const GOAL_ID = 'goal-id-123'
const MILESTONE_ID = 'milestone-id-123'

const mockGoalWithProgress = () => ({
    ...createMockRecoveryGoal(),
    milestones: [],
    progress: 0,
    totalMilestones: 0,
    completedMilestones: 0
})

describe('RecoveryGoalController', () => {
    let res: Response

    beforeEach(() => {
        jest.clearAllMocks()
        res = createMockResponse() as unknown as Response
    })

    // ==================== createGoal ====================
    describe('createGoal', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                body: { title: 'New Goal', category: 'LIFESTYLE' }
            }) as unknown as Request

            await expect(
                recoveryGoalController.createGoal(req, res)
            ).rejects.toThrow()
        })

        it('creates goal and returns 201', async () => {
            const goal = mockGoalWithProgress()
            jest.spyOn(recoveryGoalService, 'createGoal').mockResolvedValue(goal)

            const req = createMockRequest({
                userId: USER_ID,
                body: { title: 'Sleep Better', category: 'LIFESTYLE' }
            }) as unknown as Request

            await recoveryGoalController.createGoal(req, res)

            expect(recoveryGoalService.createGoal).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ title: 'Sleep Better' })
            )
            expect(res.status).toHaveBeenCalledWith(201)
        })
    })

    // ==================== getGoals ====================
    describe('getGoals', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                recoveryGoalController.getGoals(req, res)
            ).rejects.toThrow()
        })

        it('returns goals with optional status filter', async () => {
            const goals = [mockGoalWithProgress()]
            jest.spyOn(recoveryGoalService, 'getUserGoals').mockResolvedValue(goals)

            const req = createMockRequest({
                userId: USER_ID,
                query: { status: 'active' }
            }) as unknown as Request

            await recoveryGoalController.getGoals(req, res)

            expect(recoveryGoalService.getUserGoals).toHaveBeenCalledWith(USER_ID, 'ACTIVE')
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: goals })
            )
        })

        it('returns all goals when no status filter', async () => {
            const goals = [mockGoalWithProgress()]
            jest.spyOn(recoveryGoalService, 'getUserGoals').mockResolvedValue(goals)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await recoveryGoalController.getGoals(req, res)

            expect(recoveryGoalService.getUserGoals).toHaveBeenCalledWith(USER_ID, undefined)
        })
    })

    // ==================== getGoal ====================
    describe('getGoal', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await expect(
                recoveryGoalController.getGoal(req, res)
            ).rejects.toThrow()
        })

        it('throws not found when goalId is missing', async () => {
            const req = createMockRequest({
                userId: USER_ID,
                params: {}
            }) as unknown as Request

            await expect(
                recoveryGoalController.getGoal(req, res)
            ).rejects.toThrow()
        })

        it('returns goal by id', async () => {
            const goal = mockGoalWithProgress()
            jest.spyOn(recoveryGoalService, 'getGoal').mockResolvedValue(goal)

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await recoveryGoalController.getGoal(req, res)

            expect(recoveryGoalService.getGoal).toHaveBeenCalledWith(GOAL_ID, USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: goal })
            )
        })
    })

    // ==================== updateGoal ====================
    describe('updateGoal', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID },
                body: { title: 'Updated' }
            }) as unknown as Request

            await expect(
                recoveryGoalController.updateGoal(req, res)
            ).rejects.toThrow()
        })

        it('updates and returns goal', async () => {
            const goal = mockGoalWithProgress()
            jest.spyOn(recoveryGoalService, 'updateGoal').mockResolvedValue(goal)

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID },
                body: { title: 'Updated Title' }
            }) as unknown as Request

            await recoveryGoalController.updateGoal(req, res)

            expect(recoveryGoalService.updateGoal).toHaveBeenCalledWith(
                GOAL_ID,
                USER_ID,
                expect.objectContaining({ title: 'Updated Title' })
            )
        })
    })

    // ==================== deleteGoal ====================
    describe('deleteGoal', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await expect(
                recoveryGoalController.deleteGoal(req, res)
            ).rejects.toThrow()
        })

        it('deletes goal and returns success', async () => {
            jest.spyOn(recoveryGoalService, 'deleteGoal').mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await recoveryGoalController.deleteGoal(req, res)

            expect(recoveryGoalService.deleteGoal).toHaveBeenCalledWith(GOAL_ID, USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: null })
            )
        })
    })

    // ==================== createMilestones ====================
    describe('createMilestones', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID },
                body: { title: 'Milestone 1' }
            }) as unknown as Request

            await expect(
                recoveryGoalController.createMilestones(req, res)
            ).rejects.toThrow()
        })

        it('creates milestone with next order', async () => {
            const milestone = createMockMilestone()
            jest.spyOn(recoveryGoalService, 'getMaxMilestoneOrder').mockResolvedValue(2)
            jest.spyOn(recoveryGoalService, 'createMilestones').mockResolvedValue([milestone])

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID },
                body: { title: 'New Milestone' }
            }) as unknown as Request

            await recoveryGoalController.createMilestones(req, res)

            expect(recoveryGoalService.getMaxMilestoneOrder).toHaveBeenCalledWith(GOAL_ID, USER_ID)
            expect(recoveryGoalService.createMilestones).toHaveBeenCalledWith(
                GOAL_ID,
                USER_ID,
                expect.objectContaining({
                    milestones: expect.arrayContaining([
                        expect.objectContaining({ title: 'New Milestone', order: 2 })
                    ])
                })
            )
            expect(res.status).toHaveBeenCalledWith(201)
        })
    })

    // ==================== updateMilestone ====================
    describe('updateMilestone', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { milestoneId: MILESTONE_ID },
                body: { title: 'Updated' }
            }) as unknown as Request

            await expect(
                recoveryGoalController.updateMilestone(req, res)
            ).rejects.toThrow()
        })

        it('updates milestone', async () => {
            const milestone = createMockMilestone()
            jest.spyOn(recoveryGoalService, 'updateMilestone').mockResolvedValue(milestone)

            const req = createMockRequest({
                userId: USER_ID,
                params: { milestoneId: MILESTONE_ID },
                body: { title: 'Updated Milestone' }
            }) as unknown as Request

            await recoveryGoalController.updateMilestone(req, res)

            expect(recoveryGoalService.updateMilestone).toHaveBeenCalledWith(
                MILESTONE_ID,
                USER_ID,
                expect.objectContaining({ title: 'Updated Milestone' })
            )
        })
    })

    // ==================== deleteMilestone ====================
    describe('deleteMilestone', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { milestoneId: MILESTONE_ID }
            }) as unknown as Request

            await expect(
                recoveryGoalController.deleteMilestone(req, res)
            ).rejects.toThrow()
        })

        it('deletes milestone and returns null', async () => {
            jest.spyOn(recoveryGoalService, 'deleteMilestone').mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: USER_ID,
                params: { milestoneId: MILESTONE_ID }
            }) as unknown as Request

            await recoveryGoalController.deleteMilestone(req, res)

            expect(recoveryGoalService.deleteMilestone).toHaveBeenCalledWith(MILESTONE_ID, USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: null })
            )
        })
    })

    // ==================== completeMilestone ====================
    describe('completeMilestone', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID, milestoneId: MILESTONE_ID }
            }) as unknown as Request

            await expect(
                recoveryGoalController.completeMilestone(req, res)
            ).rejects.toThrow()
        })

        it('completes milestone', async () => {
            jest.spyOn(recoveryGoalService, 'completeMilestone').mockResolvedValue(undefined)

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID, milestoneId: MILESTONE_ID }
            }) as unknown as Request

            await recoveryGoalController.completeMilestone(req, res)

            expect(recoveryGoalService.completeMilestone).toHaveBeenCalledWith(
                MILESTONE_ID,
                GOAL_ID,
                USER_ID
            )
        })
    })

    // ==================== completeGoal ====================
    describe('completeGoal', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest({
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await expect(
                recoveryGoalController.completeGoal(req, res)
            ).rejects.toThrow()
        })

        it('completes goal and returns updated goal', async () => {
            const goal = mockGoalWithProgress()
            jest.spyOn(recoveryGoalService, 'completeGoal').mockResolvedValue(goal)

            const req = createMockRequest({
                userId: USER_ID,
                params: { goalId: GOAL_ID }
            }) as unknown as Request

            await recoveryGoalController.completeGoal(req, res)

            expect(recoveryGoalService.completeGoal).toHaveBeenCalledWith(GOAL_ID, USER_ID)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: goal })
            )
        })
    })

    // ==================== getStats ====================
    describe('getStats', () => {
        it('throws unauthorized when no userId', async () => {
            const req = createMockRequest() as unknown as Request

            await expect(
                recoveryGoalController.getStats(req, res)
            ).rejects.toThrow()
        })

        it('returns stats with no filters', async () => {
            const stats = { totalGoals: 5, completedGoals: 2, completionRate: 40 }
            jest.spyOn(recoveryGoalService, 'getStats').mockResolvedValue(stats)

            const req = createMockRequest({ userId: USER_ID }) as unknown as Request

            await recoveryGoalController.getStats(req, res)

            expect(recoveryGoalService.getStats).toHaveBeenCalledWith(
                USER_ID,
                { fromDate: undefined, toDate: undefined, category: undefined }
            )
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: stats })
            )
        })

        it('parses fromDate and toDate from query', async () => {
            const stats = { totalGoals: 3, completedGoals: 1, completionRate: 33 }
            jest.spyOn(recoveryGoalService, 'getStats').mockResolvedValue(stats)

            const req = createMockRequest({
                userId: USER_ID,
                query: { fromDate: '2026-01-01', toDate: '2026-06-01', category: 'LIFESTYLE' }
            }) as unknown as Request

            await recoveryGoalController.getStats(req, res)

            expect(recoveryGoalService.getStats).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({
                    fromDate: expect.any(Date),
                    toDate: expect.any(Date),
                    category: 'LIFESTYLE'
                })
            )
        })
    })
})
