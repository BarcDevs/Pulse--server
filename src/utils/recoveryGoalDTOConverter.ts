import type {
    MilestoneType,
    RecoveryGoalType
} from '../types/data/RecoveryGoalType'

type RawGoal = {
    category: string
    status: string
    id: string
    profileId: string
    title: string
    description: string | null
    isPrimary: boolean
    targetDate: Date | null
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
    category: goal.category.toLowerCase() as RecoveryGoalType['category'],
    status: goal.status.toLowerCase() as RecoveryGoalType['status']
})

export const convertMilestoneToDTO = (
    milestone: RawMilestone
): MilestoneType => ({
    ...milestone,
    status: milestone.status.toLowerCase() as MilestoneType['status']
})
