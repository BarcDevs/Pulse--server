export type GoalCategory = 'physical' | 'mental' | 'lifestyle'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'
export type MilestoneStatus = 'locked' | 'active' | 'completed'

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
    createdAt: Date
    updatedAt: Date
}

export type RecoveryGoalWithProgress = RecoveryGoalType & {
    progress: number
}

export type NewRecoveryGoalType = {
    title: string
    description?: string
    category: GoalCategory
    targetDate?: string
    isPrimary?: boolean
}

export type UpdateRecoveryGoalType = {
    title?: string
    description?: string
    status?: Extract<GoalStatus, 'paused' | 'abandoned'>
    targetDate?: string
    isPrimary?: boolean
}

export type UpdateMilestoneType = {
    title?: string
    description?: string | null
    order?: number
}
