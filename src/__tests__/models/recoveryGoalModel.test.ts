// @ts-nocheck
import * as recoveryGoalModel from '../../models/recoveryGoalModel'
import { prismaMock } from '../setup/jestSetup'
import {
    createMockMilestone,
    createMockRecoveryGoal
} from '../setup/testSetup'

jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        generic: {
            notFound: jest.fn((name) => new Error(`${name} not found`)),
            conflict: jest.fn((msg) => new Error(msg))
        }
    }
}))

describe('RecoveryGoalModel', () => {
    describe('getProfileIdForUser', () => {
        it('returns profile id when found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ id: 'profile-id' })

            const result = await recoveryGoalModel.getProfileIdForUser('user-id')

            expect(result).toBe('profile-id')
        })

        it('throws when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            await expect(
                recoveryGoalModel.getProfileIdForUser('user-id')
            ).rejects.toThrow()
        })
    })

    describe('createGoal', () => {
        it('creates goal and returns DTO', async () => {
            const rawGoal = { ...createMockRecoveryGoal() }
            prismaMock.recoveryGoal.create.mockResolvedValue(rawGoal)

            const result = await recoveryGoalModel.createGoal({
                profileId: 'profile-id',
                title: 'Get better sleep',
                category: 'lifestyle'
            })

            expect(prismaMock.recoveryGoal.create).toHaveBeenCalled()
            expect(result).toBeDefined()
            expect(result.title).toBe(rawGoal.title)
        })
    })

    describe('getGoalById', () => {
        it('returns goal DTO when found', async () => {
            const rawGoal = createMockRecoveryGoal()
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(rawGoal)

            const result = await recoveryGoalModel.getGoalById(
                'goal-id',
                'profile-id'
            )

            expect(result).not.toBeNull()
        })

        it('returns null when not found', async () => {
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            const result = await recoveryGoalModel.getGoalById(
                'goal-id',
                'profile-id'
            )

            expect(result).toBeNull()
        })

        it('passes id and profileId to query', async () => {
            prismaMock.recoveryGoal.findFirst.mockResolvedValue(null)

            await recoveryGoalModel.getGoalById('g-1', 'p-1')

            expect(prismaMock.recoveryGoal.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'g-1', profileId: 'p-1' }
                })
            )
        })
    })

    describe('getGoalsByProfileId', () => {
        it('returns mapped goals array', async () => {
            const goals = [createMockRecoveryGoal(), createMockRecoveryGoal({ id: 'goal-2' })]
            prismaMock.recoveryGoal.findMany.mockResolvedValue(goals)

            const result = await recoveryGoalModel.getGoalsByProfileId('profile-id')

            expect(result).toHaveLength(2)
        })

        it('returns empty array when no goals', async () => {
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])

            const result = await recoveryGoalModel.getGoalsByProfileId('profile-id')

            expect(result).toEqual([])
        })
    })

    describe('deleteGoal', () => {
        it('calls recoveryGoal.delete with goal id', async () => {
            prismaMock.recoveryGoal.delete.mockResolvedValue(createMockRecoveryGoal())

            await recoveryGoalModel.deleteGoal('goal-id')

            expect(prismaMock.recoveryGoal.delete).toHaveBeenCalledWith({
                where: { id: 'goal-id' }
            })
        })
    })

    describe('getMaxMilestoneOrder', () => {
        it('returns max order value', async () => {
            prismaMock.milestone.aggregate.mockResolvedValue({ _max: { order: 3 } })

            const result = await recoveryGoalModel.getMaxMilestoneOrder('goal-id')

            expect(result).toBe(3)
        })

        it('returns null when no milestones', async () => {
            prismaMock.milestone.aggregate.mockResolvedValue({ _max: { order: null } })

            const result = await recoveryGoalModel.getMaxMilestoneOrder('goal-id')

            expect(result).toBeNull()
        })
    })

    describe('getMilestoneById', () => {
        it('returns null when not found', async () => {
            prismaMock.milestone.findUnique.mockResolvedValue(null)

            const result = await recoveryGoalModel.getMilestoneById('milestone-id')

            expect(result).toBeNull()
        })

        it('returns milestone with goal when found', async () => {
            const rawMilestone = {
                ...createMockMilestone(),
                goal: createMockRecoveryGoal()
            }
            prismaMock.milestone.findUnique.mockResolvedValue(rawMilestone)

            const result = await recoveryGoalModel.getMilestoneById('milestone-id')

            expect(result).not.toBeNull()
            expect(result?.goal).toBeDefined()
        })
    })

    describe('getMilestonesByGoalId', () => {
        it('returns mapped milestones ordered by order', async () => {
            const milestones = [
                createMockMilestone({ order: 0 }),
                createMockMilestone({ id: 'ms-2', order: 1 })
            ]
            prismaMock.milestone.findMany.mockResolvedValue(milestones)

            const result = await recoveryGoalModel.getMilestonesByGoalId('goal-id')

            expect(result).toHaveLength(2)
            expect(prismaMock.milestone.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { goalId: 'goal-id' },
                    orderBy: { order: 'asc' }
                })
            )
        })
    })

    describe('updateMilestone', () => {
        it('calls milestone.update with the milestone id', async () => {
            const milestone = createMockMilestone({ title: 'Updated title' })
            prismaMock.milestone.update.mockResolvedValue(milestone)

            await recoveryGoalModel.updateMilestone('ms-id', { title: 'Updated title' })

            expect(prismaMock.milestone.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'ms-id' } })
            )
        })
    })

    describe('deleteMilestone', () => {
        it('calls milestone.delete with the milestone id', async () => {
            prismaMock.milestone.delete.mockResolvedValue(createMockMilestone())

            await recoveryGoalModel.deleteMilestone('ms-id')

            expect(prismaMock.milestone.delete).toHaveBeenCalledWith({
                where: { id: 'ms-id' }
            })
        })
    })

    describe('getGoalsStats', () => {
        it('returns aggregated counts for all statuses', async () => {
            prismaMock.recoveryGoal.count.mockResolvedValue(5)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([
                { category: 'LIFESTYLE', _count: { _all: 3 } },
                { category: 'MENTAL_HEALTH', _count: { _all: 2 } }
            ])

            const result = await recoveryGoalModel.getGoalsStats('profile-id')

            expect(result.totalCreated).toBe(5)
            expect(result.completed).toBe(5)
            expect(result.active).toBe(5)
            expect(result.paused).toBe(5)
        })

        it('maps byCategory correctly', async () => {
            prismaMock.recoveryGoal.count.mockResolvedValue(0)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([
                { category: 'LIFESTYLE', _count: { _all: 4 } }
            ])

            const result = await recoveryGoalModel.getGoalsStats('profile-id')

            expect(result.byCategory['LIFESTYLE']).toBe(4)
        })

        it('returns zero byCategory when no goals', async () => {
            prismaMock.recoveryGoal.count.mockResolvedValue(0)
            prismaMock.recoveryGoal.groupBy.mockResolvedValue([])

            const result = await recoveryGoalModel.getGoalsStats('profile-id')

            expect(result.byCategory).toEqual({})
        })
    })

    describe('updateGoal', () => {
        it('calls recoveryGoal.update with the goal id', async () => {
            const goal = createMockRecoveryGoal({ title: 'Updated' })
            prismaMock.recoveryGoal.update.mockResolvedValue(goal)

            const result = await recoveryGoalModel.updateGoal('goal-id', { title: 'Updated' })

            expect(prismaMock.recoveryGoal.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'goal-id' } })
            )
            expect(result).not.toBeNull()
            expect(result?.title).toBe('Updated')
        })

        it('propagates Prisma error for non-existent goal', async () => {
            prismaMock.recoveryGoal.update.mockRejectedValue(new Error('P2025'))

            await expect(
                recoveryGoalModel.updateGoal('non-existent', { title: 'X' })
            ).rejects.toThrow('P2025')
        })
    })

    describe('getGoalsByProfileId', () => {
        it('filters by status when provided', async () => {
            const { GoalStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])

            await recoveryGoalModel.getGoalsByProfileId('profile-id', GoalStatus.ACTIVE)

            expect(prismaMock.recoveryGoal.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        profileId: 'profile-id',
                        status: GoalStatus.ACTIVE
                    })
                })
            )
        })
    })

    describe('countMilestonesByGoalId', () => {
        it('returns count of milestones for goal', async () => {
            prismaMock.milestone.count.mockResolvedValue(3)

            const result = await recoveryGoalModel.countMilestonesByGoalId('goal-id')

            expect(result).toBe(3)
            expect(prismaMock.milestone.count).toHaveBeenCalledWith(
                expect.objectContaining({ where: {
                    goalId: 'goal-id'
                } })
            )
        })

        it('returns 0 when no milestones', async () => {
            prismaMock.milestone.count.mockResolvedValue(0)

            const result = await recoveryGoalModel.countMilestonesByGoalId('goal-id')

            expect(result).toBe(0)
        })
    })

    describe('setPrimaryGoal', () => {
        it('clears all primary flags then sets the target goal as primary', async () => {
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.recoveryGoal.updateMany.mockResolvedValue({
                count: 2
            })
            prismaMock.recoveryGoal.update.mockResolvedValue(createMockRecoveryGoal({
                isPrimary: true
            }))

            await recoveryGoalModel.setPrimaryGoal('profile-id', 'goal-id')

            expect(prismaMock.recoveryGoal.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { profileId: 'profile-id' },
                    data: { isPrimary: false }
                })
            )
            expect(prismaMock.recoveryGoal.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'goal-id' },
                    data: { isPrimary: true }
                })
            )
        })
    })

    describe('createMilestonesInBatch', () => {
        it('creates milestones and sets first as ACTIVE when setFirstActive is true', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.milestone.create
                .mockResolvedValueOnce(createMockMilestone({ order: 0, status: MilestoneStatus.ACTIVE }))
                .mockResolvedValueOnce(createMockMilestone({ id: 'ms-2', order: 1, status: MilestoneStatus.LOCKED }))

            const result = await recoveryGoalModel.createMilestonesInBatch({
                goalId: 'goal-id',
                milestones: [
                    { title: 'First', order: 0 },
                    { title: 'Second', order: 1 }
                ],
                setFirstActive: true
            })

            expect(result).toHaveLength(2)
            expect(prismaMock.milestone.create).toHaveBeenCalledTimes(2)
        })

        it('throws conflict when milestone count exceeds max (8)', async () => {
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.count.mockResolvedValue(6)

            await expect(
                recoveryGoalModel.createMilestonesInBatch({
                    goalId: 'goal-id',
                    milestones: [
                        { title: 'A', order: 6 },
                        { title: 'B', order: 7 },
                        { title: 'C', order: 8 }
                    ],
                    setFirstActive: false
                })
            ).rejects.toThrow()
        })

        it('creates all milestones as LOCKED when setFirstActive is false', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.count.mockResolvedValue(0)
            prismaMock.milestone.create.mockResolvedValue(
                createMockMilestone({ status: MilestoneStatus.LOCKED })
            )

            await recoveryGoalModel.createMilestonesInBatch({
                goalId: 'goal-id',
                milestones: [{ title: 'First', order: 0 }],
                setFirstActive: false
            })

            expect(prismaMock.milestone.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: MilestoneStatus.LOCKED })
                })
            )
        })
    })

    describe('completeMilestoneAndAdvance', () => {
        it('throws when milestone not found', async () => {
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.findUnique.mockResolvedValue(null)

            await expect(
                recoveryGoalModel.completeMilestoneAndAdvance('ms-id', 'goal-id')
            ).rejects.toThrow()
        })

        it('is a no-op when milestone already completed', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.findUnique.mockResolvedValue(
                createMockMilestone({ status: MilestoneStatus.COMPLETED })
            )

            await recoveryGoalModel.completeMilestoneAndAdvance('ms-id', 'goal-id')

            expect(prismaMock.milestone.update).not.toHaveBeenCalled()
        })

        it('throws when milestone is not ACTIVE', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.findUnique.mockResolvedValue(
                createMockMilestone({ status: MilestoneStatus.LOCKED })
            )

            await expect(
                recoveryGoalModel.completeMilestoneAndAdvance('ms-id', 'goal-id')
            ).rejects.toThrow()
        })

        it('marks milestone completed and activates the next one', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            const nextMilestone = createMockMilestone({ id: 'ms-next', status: MilestoneStatus.LOCKED })
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.findUnique.mockResolvedValue(
                createMockMilestone({ status: MilestoneStatus.ACTIVE })
            )
            prismaMock.milestone.update.mockResolvedValue(createMockMilestone())
            prismaMock.milestone.findFirst.mockResolvedValue(nextMilestone)

            await recoveryGoalModel.completeMilestoneAndAdvance('ms-id', 'goal-id')

            expect(prismaMock.milestone.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ms-next' },
                    data: { status: MilestoneStatus.ACTIVE }
                })
            )
        })

        it('marks goal completed when last milestone is done', async () => {
            const { MilestoneStatus, GoalStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.$executeRaw.mockResolvedValue(0)
            prismaMock.milestone.findUnique.mockResolvedValue(
                createMockMilestone({ status: MilestoneStatus.ACTIVE })
            )
            prismaMock.milestone.update.mockResolvedValue(createMockMilestone())
            prismaMock.milestone.findFirst.mockResolvedValue(null)
            prismaMock.recoveryGoal.update.mockResolvedValue(createMockRecoveryGoal())

            await recoveryGoalModel.completeMilestoneAndAdvance('ms-id', 'goal-id')

            expect(prismaMock.recoveryGoal.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'goal-id' },
                    data: expect.objectContaining({ status: GoalStatus.COMPLETED })
                })
            )
        })
    })

    describe('activateFirstLockedMilestone', () => {
        it('activates the first locked milestone', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            const locked = createMockMilestone({ id: 'ms-locked', status: MilestoneStatus.LOCKED })
            prismaMock.milestone.findFirst.mockResolvedValue(locked)
            prismaMock.milestone.update.mockResolvedValue(locked)

            await recoveryGoalModel.activateFirstLockedMilestone('goal-id')

            expect(prismaMock.milestone.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'ms-locked' },
                    data: { status: MilestoneStatus.ACTIVE }
                })
            )
        })

        it('is a no-op when no locked milestones exist', async () => {
            prismaMock.milestone.findFirst.mockResolvedValue(null)

            await recoveryGoalModel.activateFirstLockedMilestone('goal-id')

            expect(prismaMock.milestone.update).not.toHaveBeenCalled()
        })
    })

    describe('lockNonCompletedMilestones', () => {
        it('calls updateMany to lock all non-completed milestones', async () => {
            const { MilestoneStatus } = require('../../../prisma/generated/prisma/enums')
            prismaMock.milestone.updateMany.mockResolvedValue({ count: 3 })

            await recoveryGoalModel.lockNonCompletedMilestones('goal-id')

            expect(prismaMock.milestone.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ goalId: 'goal-id' }),
                    data: { status: MilestoneStatus.LOCKED }
                })
            )
        })
    })

    describe('getMilestonesStats', () => {
        it('returns counts for all milestone statuses', async () => {
            prismaMock.milestone.count.mockResolvedValue(4)

            const result = await recoveryGoalModel.getMilestonesStats('profile-id')

            expect(result.totalCreated).toBe(4)
            expect(result.completed).toBe(4)
            expect(result.active).toBe(4)
            expect(result.paused).toBe(4)
        })

        it('returns zeros when no milestones', async () => {
            prismaMock.milestone.count.mockResolvedValue(0)

            const result = await recoveryGoalModel.getMilestonesStats('profile-id')

            expect(result.totalCreated).toBe(0)
            expect(result.completed).toBe(0)
        })
    })

    describe('getCompletedDatesForStreak', () => {
        it('returns combined dates from completed goals and milestones', async () => {
            const completedDate = new Date('2026-05-01')
            prismaMock.recoveryGoal.findMany.mockResolvedValue([
                { completedAt: completedDate }
            ])
            prismaMock.milestone.findMany.mockResolvedValue([
                { completedAt: completedDate }
            ])

            const result = await recoveryGoalModel.getCompletedDatesForStreak('profile-id')

            expect(result).toHaveLength(2)
            expect(result[0]).toEqual(completedDate)
        })

        it('returns empty array when no completed goals or milestones', async () => {
            prismaMock.recoveryGoal.findMany.mockResolvedValue([])
            prismaMock.milestone.findMany.mockResolvedValue([])

            const result = await recoveryGoalModel.getCompletedDatesForStreak('profile-id')

            expect(result).toEqual([])
        })

        it('excludes null completedAt values', async () => {
            prismaMock.recoveryGoal.findMany.mockResolvedValue([{ completedAt: null }])
            prismaMock.milestone.findMany.mockResolvedValue([{ completedAt: null }])

            const result = await recoveryGoalModel.getCompletedDatesForStreak('profile-id')

            expect(result).toEqual([])
        })
    })
})
