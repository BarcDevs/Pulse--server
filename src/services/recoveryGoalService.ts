import { MAX_ACTIVE_GOALS } from '../config/recoveryGoals'
import { errorFactory } from '../errors/factory/ErrorFactory'
import * as RecoveryGoalModel from '../models/recoveryGoalModel'
import { getProfileIdForUser } from '../models/recoveryGoalModel'
import type {
    MilestoneType,
    NewRecoveryGoalType,
    RecoveryGoalType,
    RecoveryGoalWithProgress,
    UpdateMilestoneType,
    UpdateRecoveryGoalType
} from '../types/data/RecoveryGoalType'
import {
    GoalStatus,
    MilestoneStatus
} from '../types/data/RecoveryGoalType'

const computeProgress = (
    completedCount: number,
    totalCount: number
): number => {
    if (totalCount === 0) return 0
    return completedCount / totalCount
}

const assertGoalActive = (goal: RecoveryGoalType): void => {
    if (goal.status !== GoalStatus.ACTIVE)
        throw errorFactory.generic.conflict(
            'Cannot modify milestones on non-active goals'
        )
}

export const createGoal = async (
    userId: string,
    data: NewRecoveryGoalType
): Promise<RecoveryGoalWithProgress> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const allGoals = await RecoveryGoalModel
        .getGoalsByProfileId(profileId)
    const activeGoals = allGoals.filter(
        (g) =>
            g.status !== GoalStatus.COMPLETED
            && g.status !== GoalStatus.ABANDONED
    )

    if (activeGoals.length >= MAX_ACTIVE_GOALS) {
        throw errorFactory.generic.conflict(
            `Cannot create more than ${MAX_ACTIVE_GOALS} active goals. `
            + 'Complete or abandon some goals to create new ones.'
        )
    }

    if (data.isPrimary) {
        await RecoveryGoalModel.setPrimaryGoal(profileId, '')
    }

    const goal = await RecoveryGoalModel.createGoal({
        profileId,
        title: data.title,
        description: data.description || null,
        category: data.category as string,
        isPrimary: data.isPrimary || false,
        targetDate: data.targetDate
            ? new Date(data.targetDate)
            : undefined
    })

    if (data.isPrimary) {
        await RecoveryGoalModel.setPrimaryGoal(profileId, goal.id)
    }

    return {
        ...goal,
        progress: 0
    }
}

export const getGoal = async (
    id: string,
    userId: string
): Promise<{
    goal: RecoveryGoalWithProgress
    milestones: MilestoneType[]
}> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goal = await RecoveryGoalModel.getGoalById(
        id,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    const milestones = await RecoveryGoalModel
        .getMilestonesByGoalId(id)

    const completedCount = milestones.filter(
        m => m.status === MilestoneStatus.COMPLETED
    ).length
    const progress = computeProgress(
        completedCount,
        milestones.length
    )

    return {
        goal: { ...goal, progress },
        milestones
    }
}

export const getUserGoals = async (
    userId: string
): Promise<RecoveryGoalWithProgress[]> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goals = await RecoveryGoalModel.getGoalsByProfileId(profileId)

    const goalsWithProgress = await Promise.all(
        goals.map(async goal => {
            const count = await RecoveryGoalModel.countMilestonesByGoalId(
                goal.id
            )
            if (count === 0) return { ...goal, progress: 0 }

            const milestones = await RecoveryGoalModel.getMilestonesByGoalId(
                goal.id
            )
            const completedCount = milestones.filter(
                m => m.status === MilestoneStatus.COMPLETED
            ).length
            const progress = computeProgress(completedCount, count)

            return { ...goal, progress }
        })
    )

    return goalsWithProgress
}

export const updateGoal = async (
    id: string,
    userId: string,
    data: UpdateRecoveryGoalType
): Promise<RecoveryGoalWithProgress> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goal = await RecoveryGoalModel.getGoalById(
        id,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    if (goal.status === GoalStatus.COMPLETED && data.status !== undefined) {
        throw errorFactory.generic.conflict(
            'Cannot change status of completed goals'
        )
    }

    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined)
        updateData.title = data.title
    if (data.description !== undefined)
        updateData.description = data.description
    if (data.targetDate !== undefined)
        updateData.targetDate = data.targetDate
            ? new Date(data.targetDate)
            : null

    if (data.status !== undefined) {
        updateData.status = data.status
        if (data.status === GoalStatus.ABANDONED) {
            await RecoveryGoalModel.lockNonCompletedMilestones(id)
        }
    }

    if (data.isPrimary === true) {
        await RecoveryGoalModel.setPrimaryGoal(
            profileId,
            id
        )
    } else if (data.isPrimary === false) {
        updateData.isPrimary = false
    }

    const updated = await RecoveryGoalModel.updateGoal(
        id,
        updateData as any
    )
    if (!updated)
        throw errorFactory.generic.notFound('Goal not found')

    const milestones = await RecoveryGoalModel
        .getMilestonesByGoalId(id)
    const completedCount = milestones.filter(
        m => m.status === MilestoneStatus.COMPLETED
    ).length
    const progress = computeProgress(
        completedCount,
        milestones.length
    )

    return { ...updated, progress }
}

export const deleteGoal = async (
    id: string,
    userId: string
): Promise<void> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goal = await RecoveryGoalModel.getGoalById(id, profileId)
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    await RecoveryGoalModel.deleteGoal(id)
}

export const getMaxMilestoneOrder = async (
    goalId: string,
    userId: string
): Promise<number> => {
    const profileId = await getProfileIdForUser(userId)
    const goal = await RecoveryGoalModel.getGoalById(
        goalId,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    const maxOrder = await RecoveryGoalModel
        .getMaxMilestoneOrder(goalId)
    return (maxOrder ?? 0) + 1
}

export const createMilestones = async (
    goalId: string,
    userId: string,
    data: {
        milestones: Array<{
            title: string
            description?: string
            order: number
        }>
    }
): Promise<MilestoneType[]> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goal = await RecoveryGoalModel.getGoalById(
        goalId,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    assertGoalActive(goal)

    const milestoneCount = await RecoveryGoalModel
        .countMilestonesByGoalId(goalId)
    const created = await RecoveryGoalModel
        .createMilestonesInBatch({
            goalId,
            milestones: data.milestones,
            setFirstActive: milestoneCount === 0
        })

    return created.map(m => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        description: m.description,
        order: m.order,
        status: m.status,
        completedAt: m.completedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
    }))
}

export const updateMilestone = async (
    id: string,
    userId: string,
    data: UpdateMilestoneType
): Promise<MilestoneType> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const milestone = await RecoveryGoalModel
        .getMilestoneById(id)
    if (!milestone)
        throw errorFactory.generic.notFound('Milestone not found')
    if (milestone.goal.profileId !== profileId)
        throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(
        milestone.goalId,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    assertGoalActive(goal)

    if (milestone.status === MilestoneStatus.COMPLETED)
        throw errorFactory.generic.conflict(
            'Cannot modify completed milestones'
        )

    const updated = await RecoveryGoalModel
        .updateMilestone(id, {
            title: data.title,
            description: data.description,
            order: data.order
        })
    if (!updated)
        throw errorFactory.generic.notFound('Milestone not found')

    return updated
}

export const completeMilestone = async (
    id: string,
    goalId: string,
    userId: string
): Promise<void> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const milestone = await RecoveryGoalModel
        .getMilestoneById(id)
    if (!milestone)
        throw errorFactory.generic.notFound('Milestone not found')
    if (milestone.goal.profileId !== profileId)
        throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(
        goalId,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    assertGoalActive(goal)

    await RecoveryGoalModel.completeMilestoneAndAdvance(
        id,
        goalId
    )
}

export const deleteMilestone = async (
    id: string,
    userId: string
): Promise<void> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const milestone = await RecoveryGoalModel
        .getMilestoneById(id)
    if (!milestone)
        throw errorFactory.generic.notFound('Milestone not found')
    if (milestone.goal.profileId !== profileId)
        throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(
        milestone.goalId,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    assertGoalActive(goal)

    await RecoveryGoalModel.deleteMilestone(id)
}

export const completeGoal = async (
    id: string,
    userId: string
): Promise<RecoveryGoalWithProgress> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const profileId = await getProfileIdForUser(userId)

    const goal = await RecoveryGoalModel.getGoalById(
        id,
        profileId
    )
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    if (goal.status !== GoalStatus.ACTIVE)
        throw errorFactory.generic.conflict('Goal is not active')

    const milestones = await RecoveryGoalModel
        .getMilestonesByGoalId(id)

    if (milestones.length === 0)
        throw errorFactory.generic.conflict(
            'Cannot complete goal without milestones'
        )

    const allCompleted = milestones.every(
        m => m.status === MilestoneStatus.COMPLETED
    )
    if (!allCompleted)
        throw errorFactory.generic.conflict(
            'Cannot complete goal with incomplete milestones'
        )

    const updated = await RecoveryGoalModel.updateGoal(
        id,
        {
            status: GoalStatus.COMPLETED
        }
    )
    if (!updated) throw errorFactory.generic.notFound('Goal not found')

    return {
        ...updated,
        progress: 1
    }
}
