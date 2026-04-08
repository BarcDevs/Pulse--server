import { errorFactory } from '../errors/factory'
import * as RecoveryGoalModel from '../models/RecoveryGoalModel'
import type {
    MilestoneType,
    NewRecoveryGoalType,
    RecoveryGoalType,
    UpdateMilestoneType,
    UpdateRecoveryGoalType
} from '../types/data/RecoveryGoalType'

export const createGoal = async (
    userId: string,
    data: Omit<NewRecoveryGoalType, 'userId'>
): Promise<RecoveryGoalType> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    return RecoveryGoalModel.createGoal({
        userId,
        title: data.title,
        description: data.description || null
    })
}

export const getGoal = async (
    id: string,
    userId: string
): Promise<RecoveryGoalType> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    const goal = await RecoveryGoalModel.getGoalById(id, userId)
    if (!goal) throw errorFactory.generic.notFound('Goal not found')
    return goal
}

export const getUserGoals = async (
    userId: string
): Promise<RecoveryGoalType[]> => {
    if (!userId) throw errorFactory.auth.unauthorized()
    return RecoveryGoalModel.getGoalsByUserId(userId)
}

export const updateGoal = async (
    id: string,
    userId: string,
    data: UpdateRecoveryGoalType
): Promise<RecoveryGoalType> => {
    if (!userId) throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(id, userId)
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    const updated = await RecoveryGoalModel.updateGoal(id, data)
    if (!updated) throw errorFactory.generic.notFound('Goal not found')
    return updated
}

export const deleteGoal = async (
    id: string,
    userId: string
): Promise<void> => {
    if (!userId) throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(id, userId)
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    await RecoveryGoalModel.deleteGoal(id)
}

export const addMilestone = async (
    goalId: string,
    userId: string,
    data: {
        title: string
    }
): Promise<MilestoneType> => {
    if (!userId) throw errorFactory.auth.unauthorized()

    const goal = await RecoveryGoalModel.getGoalById(goalId, userId)
    if (!goal) throw errorFactory.generic.notFound('Goal not found')

    return RecoveryGoalModel.createMilestoneWithinTransaction({
        goalId,
        title: data.title
    })
}

export const updateMilestone = async (
    id: string,
    userId: string,
    data: UpdateMilestoneType
): Promise<MilestoneType> => {
    if (!userId) throw errorFactory.auth.unauthorized()

    const milestone = await RecoveryGoalModel.getMilestoneById(id)
    if (!milestone) throw errorFactory.generic.notFound('Milestone not found')
    if (milestone.goal.userId !== userId)
        throw errorFactory.auth.unauthorized()

    const updated = await RecoveryGoalModel.updateMilestone(id, data)
    if (!updated) throw errorFactory.generic.notFound('Milestone not found')
    return updated
}

export const deleteMilestone = async (
    id: string,
    userId: string
): Promise<void> => {
    if (!userId) throw errorFactory.auth.unauthorized()

    const milestone = await RecoveryGoalModel.getMilestoneById(id)
    if (!milestone) throw errorFactory.generic.notFound('Milestone not found')
    if (milestone.goal.userId !== userId)
        throw errorFactory.auth.unauthorized()

    await RecoveryGoalModel.deleteMilestone(id)
}
