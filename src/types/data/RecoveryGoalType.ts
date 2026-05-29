import {
    type GoalCategory,
    type GoalStatus,
    type MilestoneStatus
} from '../../../prisma/generated/prisma/enums'

export type {
    GoalCategory,
    GoalStatus,
    MilestoneStatus
}

export type MilestoneType = {
    id: string
    goalId: string
    title: string
    description: string | null
    order: number
    status: MilestoneStatus
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export type RecoveryGoalType = {
    id: string
    profileId: string
    title: string
    description: string | null
    category: GoalCategory
    isPrimary: boolean
    status: GoalStatus
    targetDate: Date | null
    pausedAt: Date | null
    completedAt: Date | null
    abandonedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export type RecoveryGoalWithProgress = RecoveryGoalType & {
    progress: number
    milestonesCount: number
}

export type NewRecoveryGoalType = {
    title: string
    description?: string
    category: string
    targetDate?: string
    isPrimary?: boolean
}

export type UpdateRecoveryGoalType = {
    title?: string
    description?: string
    status?: GoalStatus
    targetDate?: string
    isPrimary?: boolean
}

export type UpdateMilestoneType = {
    title?: string
    description?: string | null
    order?: number
}

export type StatsFilter = {
    fromDate?: Date
    toDate?: Date
    category?: string
}

export type StatsResponse = {
    goals: {
        totalCreated: number
        completed: number
        completionRate: number
        streak: number
        active: number
        paused: number
        byCategory: Record<string, number>
    }
    milestones: {
        totalCreated: number
        completed: number
        completionRate: number
        streak: number
        active: number
        paused: number
    }
}
