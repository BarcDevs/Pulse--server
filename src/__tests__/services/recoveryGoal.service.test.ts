// @ts-nocheck
import {
    GoalStatus,
    MilestoneStatus
} from '../../../prisma/generated/prisma/enums'
import * as streakCalc from '../../lib/aiInsight/decision/streakCalculator'
import * as authModel from '../../models/authModel'
import * as RecoveryGoalModel from '../../models/recoveryGoalModel'
import {
    completeGoal,
    completeMilestone,
    createGoal,
    createMilestones,
    deleteGoal,
    deleteMilestone,
    getGoal,
    getMaxMilestoneOrder,
    getStats,
    getUserGoals,
    updateGoal,
    updateMilestone
} from '../../services/recoveryGoalService'
import {
    createMockMilestone,
    createMockRecoveryGoal
} from '../setup/testSetup'

jest.mock('../../models/recoveryGoalModel')
jest.mock('../../models/authModel')
jest.mock('../../lib/aiInsight/decision/streakCalculator')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const PROFILE_ID = 'profile-id-123'
const USER_ID = 'user-id-123'
const GOAL_ID = 'goal-id-123'
const MILESTONE_ID = 'milestone-id-123'

const mockGetProfileId = () =>
    jest.spyOn(RecoveryGoalModel, 'getProfileIdForUser')
        .mockResolvedValue(PROFILE_ID)

describe('RecoveryGoalService', () => {
    beforeEach(() => jest.clearAllMocks())

    // ==================== createGoal ====================
    describe('createGoal', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(
                createGoal('', { title: 'Test', category: 'LIFESTYLE' })
            ).rejects.toThrow()
        })

        it('throws conflict when active goal limit reached', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalsByProfileId')
                .mockResolvedValue(
                    Array.from({ length: 5 }, () =>
                        createMockRecoveryGoal({ status: GoalStatus.ACTIVE })
                    )
                )

            await expect(
                createGoal(USER_ID, { title: 'New Goal', category: 'LIFESTYLE' })
            ).rejects.toThrow(/active goals/)
        })

        it('creates goal and returns with progress 0', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal()
            jest.spyOn(RecoveryGoalModel, 'getGoalsByProfileId')
                .mockResolvedValue([])
            jest.spyOn(RecoveryGoalModel, 'createGoal')
                .mockResolvedValue(mockGoal)

            const result = await createGoal(USER_ID, {
                title: 'Sleep better',
                category: 'LIFESTYLE'
            })

            expect(result.progress).toBe(0)
            expect(result.milestonesCount).toBe(0)
        })

        it('sets primary goal when isPrimary is true', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal({ isPrimary: true })
            jest.spyOn(RecoveryGoalModel, 'getGoalsByProfileId')
                .mockResolvedValue([])
            jest.spyOn(RecoveryGoalModel, 'createGoal')
                .mockResolvedValue(mockGoal)
            const setPrimary = jest.spyOn(RecoveryGoalModel, 'setPrimaryGoal')
                .mockResolvedValue(undefined)

            await createGoal(USER_ID, {
                title: 'Primary',
                category: 'LIFESTYLE',
                isPrimary: true
            })

            expect(setPrimary).toHaveBeenCalledTimes(2)
        })
    })

    // ==================== getGoal ====================
    describe('getGoal', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(getGoal(GOAL_ID, '')).rejects.toThrow()
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(getGoal(GOAL_ID, USER_ID)).rejects.toThrow(/Goal/)
        })

        it('returns goal with computed progress', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal()
            const milestones = [
                createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                createMockMilestone({ status: MilestoneStatus.ACTIVE })
            ]
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(mockGoal)
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue(milestones)

            const result = await getGoal(GOAL_ID, USER_ID)

            expect(result.goal.progress).toBe(0.5)
            expect(result.goal.milestonesCount).toBe(2)
            expect(result.milestones).toHaveLength(2)
        })

        it('returns progress 0 when no milestones', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([])

            const { goal } = await getGoal(GOAL_ID, USER_ID)

            expect(goal.progress).toBe(0)
        })
    })

    // ==================== getUserGoals ====================
    describe('getUserGoals', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(getUserGoals('')).rejects.toThrow()
        })

        it('returns goals with progress', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal()
            jest.spyOn(RecoveryGoalModel, 'getGoalsByProfileId').mockResolvedValue([mockGoal])
            jest.spyOn(RecoveryGoalModel, 'countMilestonesByGoalId').mockResolvedValue(2)
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([
                createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                createMockMilestone({ status: MilestoneStatus.ACTIVE })
            ])

            const result = await getUserGoals(USER_ID)

            expect(result).toHaveLength(1)
            expect(result[0].progress).toBe(0.5)
        })

        it('returns progress 0 for goals with no milestones', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalsByProfileId').mockResolvedValue([createMockRecoveryGoal()])
            jest.spyOn(RecoveryGoalModel, 'countMilestonesByGoalId').mockResolvedValue(0)

            const result = await getUserGoals(USER_ID)

            expect(result[0].progress).toBe(0)
            expect(result[0].milestonesCount).toBe(0)
        })
    })

    // ==================== updateGoal ====================
    describe('updateGoal', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(updateGoal(GOAL_ID, '', {})).rejects.toThrow()
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(updateGoal(GOAL_ID, USER_ID, {})).rejects.toThrow(/Goal/)
        })

        it('throws conflict when updating details on paused goal', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.PAUSED })
            )

            await expect(
                updateGoal(GOAL_ID, USER_ID, { title: 'New Title' })
            ).rejects.toThrow(/paused/)
        })

        it('throws conflict on invalid status transition', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.COMPLETED })
            )

            await expect(
                updateGoal(GOAL_ID, USER_ID, { status: GoalStatus.ACTIVE })
            ).rejects.toThrow()
        })

        it('transitions ACTIVE → PAUSED and sets pausedAt', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal({ status: GoalStatus.ACTIVE })
            const updatedGoal = createMockRecoveryGoal({ status: GoalStatus.PAUSED })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(mockGoal)
            const updateSpy = jest.spyOn(RecoveryGoalModel, 'updateGoal').mockResolvedValue(updatedGoal)
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([])

            await updateGoal(GOAL_ID, USER_ID, { status: GoalStatus.PAUSED })

            expect(updateSpy).toHaveBeenCalledWith(
                GOAL_ID,
                expect.objectContaining({ status: GoalStatus.PAUSED, pausedAt: expect.any(Date) })
            )
        })

        it('locks non-completed milestones when transitioning to ABANDONED', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.ACTIVE })
            )
            jest.spyOn(RecoveryGoalModel, 'updateGoal').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.ABANDONED })
            )
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([])
            const lockSpy = jest.spyOn(RecoveryGoalModel, 'lockNonCompletedMilestones').mockResolvedValue(undefined)

            await updateGoal(GOAL_ID, USER_ID, { status: GoalStatus.ABANDONED })

            expect(lockSpy).toHaveBeenCalledWith(GOAL_ID)
        })

        it('returns goal with computed progress after update', async () => {
            mockGetProfileId()
            const mockGoal = createMockRecoveryGoal({ status: GoalStatus.ACTIVE })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(mockGoal)
            jest.spyOn(RecoveryGoalModel, 'updateGoal').mockResolvedValue(mockGoal)
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([
                createMockMilestone({ status: MilestoneStatus.COMPLETED })
            ])

            const result = await updateGoal(GOAL_ID, USER_ID, { title: 'Updated' })

            expect(result.progress).toBe(1)
        })
    })

    // ==================== deleteGoal ====================
    describe('deleteGoal', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(deleteGoal(GOAL_ID, '')).rejects.toThrow()
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(deleteGoal(GOAL_ID, USER_ID)).rejects.toThrow(/Goal/)
        })

        it('deletes the goal', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            const deleteSpy = jest.spyOn(RecoveryGoalModel, 'deleteGoal').mockResolvedValue(undefined)

            await deleteGoal(GOAL_ID, USER_ID)

            expect(deleteSpy).toHaveBeenCalledWith(GOAL_ID)
        })
    })

    // ==================== getMaxMilestoneOrder ====================
    describe('getMaxMilestoneOrder', () => {
        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(getMaxMilestoneOrder(GOAL_ID, USER_ID)).rejects.toThrow(/Goal/)
        })

        it('returns maxOrder + 1', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMaxMilestoneOrder').mockResolvedValue(3)

            const result = await getMaxMilestoneOrder(GOAL_ID, USER_ID)

            expect(result).toBe(4)
        })

        it('returns 1 when no milestones exist (null maxOrder)', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMaxMilestoneOrder').mockResolvedValue(null)

            const result = await getMaxMilestoneOrder(GOAL_ID, USER_ID)

            expect(result).toBe(1)
        })
    })

    // ==================== createMilestones ====================
    describe('createMilestones', () => {
        const milestoneData = {
            milestones: [{ title: 'Step 1', order: 0 }]
        }

        it('throws unauthorized when userId is empty', async () => {
            await expect(
                createMilestones(GOAL_ID, '', milestoneData)
            ).rejects.toThrow()
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(
                createMilestones(GOAL_ID, USER_ID, milestoneData)
            ).rejects.toThrow(/Goal/)
        })

        it('throws conflict when goal is not active', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.PAUSED })
            )

            await expect(
                createMilestones(GOAL_ID, USER_ID, milestoneData)
            ).rejects.toThrow()
        })

        it('creates milestones and returns mapped list', async () => {
            mockGetProfileId()
            const rawMilestone = createMockMilestone()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'countMilestonesByGoalId').mockResolvedValue(0)
            jest.spyOn(RecoveryGoalModel, 'createMilestonesInBatch').mockResolvedValue([rawMilestone])

            const result = await createMilestones(GOAL_ID, USER_ID, milestoneData)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe(rawMilestone.id)
        })
    })

    // ==================== updateMilestone ====================
    describe('updateMilestone', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(updateMilestone(MILESTONE_ID, '', {})).rejects.toThrow()
        })

        it('throws not found when milestone does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue(null)

            await expect(
                updateMilestone(MILESTONE_ID, USER_ID, {})
            ).rejects.toThrow(/Milestone/)
        })

        it('throws unauthorized when profile does not match', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone(),
                goalId: GOAL_ID,
                goal: { profileId: 'different-profile-id' }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())

            await expect(
                updateMilestone(MILESTONE_ID, USER_ID, {})
            ).rejects.toThrow()
        })

        it('throws conflict when milestone is completed', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())

            await expect(
                updateMilestone(MILESTONE_ID, USER_ID, {})
            ).rejects.toThrow(/completed/)
        })

        it('throws conflict when milestone is locked', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone({ status: MilestoneStatus.LOCKED }),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())

            await expect(
                updateMilestone(MILESTONE_ID, USER_ID, {})
            ).rejects.toThrow(/locked/)
        })

        it('updates and returns milestone', async () => {
            mockGetProfileId()
            const updatedMilestone = createMockMilestone({ title: 'Updated' })
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone(),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'updateMilestone').mockResolvedValue(updatedMilestone)

            const result = await updateMilestone(MILESTONE_ID, USER_ID, { title: 'Updated' })

            expect(result.title).toBe('Updated')
        })
    })

    // ==================== completeMilestone ====================
    describe('completeMilestone', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(
                completeMilestone(MILESTONE_ID, GOAL_ID, '')
            ).rejects.toThrow()
        })

        it('throws not found when milestone does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue(null)

            await expect(
                completeMilestone(MILESTONE_ID, GOAL_ID, USER_ID)
            ).rejects.toThrow(/Milestone/)
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone(),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(
                completeMilestone(MILESTONE_ID, GOAL_ID, USER_ID)
            ).rejects.toThrow(/Goal/)
        })

        it('completes milestone and advances', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone(),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            const completeSpy = jest.spyOn(RecoveryGoalModel, 'completeMilestoneAndAdvance')
                .mockResolvedValue(undefined)

            await completeMilestone(MILESTONE_ID, GOAL_ID, USER_ID)

            expect(completeSpy).toHaveBeenCalledWith(MILESTONE_ID, GOAL_ID)
        })
    })

    // ==================== deleteMilestone ====================
    describe('deleteMilestone', () => {
        it('throws conflict when milestone is completed', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())

            await expect(
                deleteMilestone(MILESTONE_ID, USER_ID)
            ).rejects.toThrow(/completed/)
        })

        it('throws conflict when milestone is locked', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone({ status: MilestoneStatus.LOCKED }),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())

            await expect(
                deleteMilestone(MILESTONE_ID, USER_ID)
            ).rejects.toThrow(/locked/)
        })

        it('deletes active milestone', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getMilestoneById').mockResolvedValue({
                ...createMockMilestone({ status: MilestoneStatus.ACTIVE }),
                goalId: GOAL_ID,
                goal: { profileId: PROFILE_ID }
            })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            const deleteSpy = jest.spyOn(RecoveryGoalModel, 'deleteMilestone').mockResolvedValue(undefined)

            await deleteMilestone(MILESTONE_ID, USER_ID)

            expect(deleteSpy).toHaveBeenCalledWith(MILESTONE_ID)
        })
    })

    // ==================== completeGoal ====================
    describe('completeGoal', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(completeGoal(GOAL_ID, '')).rejects.toThrow()
        })

        it('throws not found when goal does not exist', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(null)

            await expect(completeGoal(GOAL_ID, USER_ID)).rejects.toThrow(/Goal/)
        })

        it('throws conflict when goal is not active', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(
                createMockRecoveryGoal({ status: GoalStatus.PAUSED })
            )

            await expect(completeGoal(GOAL_ID, USER_ID)).rejects.toThrow(/not active/)
        })

        it('throws conflict when goal has no milestones', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([])

            await expect(completeGoal(GOAL_ID, USER_ID)).rejects.toThrow(/milestones/)
        })

        it('throws conflict when milestones are not all completed', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([
                createMockMilestone({ status: MilestoneStatus.COMPLETED }),
                createMockMilestone({ status: MilestoneStatus.ACTIVE })
            ])

            await expect(completeGoal(GOAL_ID, USER_ID)).rejects.toThrow(/incomplete/)
        })

        it('completes goal when all milestones are done', async () => {
            mockGetProfileId()
            const completedGoal = createMockRecoveryGoal({ status: GoalStatus.COMPLETED })
            jest.spyOn(RecoveryGoalModel, 'getGoalById').mockResolvedValue(createMockRecoveryGoal())
            jest.spyOn(RecoveryGoalModel, 'getMilestonesByGoalId').mockResolvedValue([
                createMockMilestone({ status: MilestoneStatus.COMPLETED })
            ])
            jest.spyOn(RecoveryGoalModel, 'updateGoal').mockResolvedValue(completedGoal)

            const result = await completeGoal(GOAL_ID, USER_ID)

            expect(result.progress).toBe(1)
            expect(result.milestonesCount).toBe(1)
        })
    })

    // ==================== getStats ====================
    describe('getStats', () => {
        it('throws unauthorized when userId is empty', async () => {
            await expect(getStats('')).rejects.toThrow()
        })

        it('returns stats with completion rates and streak', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalsStats').mockResolvedValue({
                totalCreated: 4,
                active: 2,
                completed: 2,
                paused: 0,
                abandoned: 0
            })
            jest.spyOn(RecoveryGoalModel, 'getMilestonesStats').mockResolvedValue({
                totalCreated: 10,
                active: 3,
                completed: 7,
                locked: 0
            })
            jest.spyOn(RecoveryGoalModel, 'getCompletedDatesForStreak').mockResolvedValue([new Date()])
            jest.spyOn(authModel, 'getUserTimezone').mockResolvedValue('UTC')
            jest.spyOn(streakCalc, 'calculateCurrentStreak').mockReturnValue(3)

            const result = await getStats(USER_ID)

            expect(result.goals.completionRate).toBe(0.5)
            expect(result.milestones.completionRate).toBe(0.7)
            expect(result.goals.streak).toBe(3)
        })

        it('returns 0 completion rates when no goals created', async () => {
            mockGetProfileId()
            jest.spyOn(RecoveryGoalModel, 'getGoalsStats').mockResolvedValue({
                totalCreated: 0,
                active: 0,
                completed: 0,
                paused: 0,
                abandoned: 0
            })
            jest.spyOn(RecoveryGoalModel, 'getMilestonesStats').mockResolvedValue({
                totalCreated: 0,
                active: 0,
                completed: 0,
                locked: 0
            })
            jest.spyOn(RecoveryGoalModel, 'getCompletedDatesForStreak').mockResolvedValue([])
            jest.spyOn(authModel, 'getUserTimezone').mockResolvedValue(null)
            jest.spyOn(streakCalc, 'calculateCurrentStreak').mockReturnValue(0)

            const result = await getStats(USER_ID)

            expect(result.goals.completionRate).toBe(0)
            expect(result.milestones.completionRate).toBe(0)
        })
    })
})
