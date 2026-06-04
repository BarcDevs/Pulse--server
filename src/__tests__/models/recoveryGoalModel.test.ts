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
    })
})
