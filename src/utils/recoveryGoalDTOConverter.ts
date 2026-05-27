import {
    type GoalCategory,
    type MilestoneType,
    type RecoveryGoalType
} from '../types/data/RecoveryGoalType'

type RawGoal = {
    category: GoalCategory
    status: string
    id: string
    profileId: string
    title: string
    description: string | null
    isPrimary: boolean
    targetDate: Date | null
    pausedAt: Date | null
    completedAt: Date | null
    abandonedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

type RawMilestone = {
    status: string
    id: string
    goalId: string
    title: string
    description: string | null
    order: number
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export const convertGoalToDTO = (goal: RawGoal): RecoveryGoalType => ({
    ...goal,
    category: goal.category as RecoveryGoalType['category'],
    status: goal.status as RecoveryGoalType['status']
})

export const convertMilestoneToDTO = (
    milestone: RawMilestone
): MilestoneType => ({
    ...milestone,
    status: milestone.status as MilestoneType['status']
})
