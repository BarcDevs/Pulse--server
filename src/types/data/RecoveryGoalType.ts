export type MilestoneType = {
    id: string
    goalId: string
    title: string
    isCompleted: boolean
    order: number
    createdAt: Date
    updatedAt: Date
}

export type RecoveryGoalType = {
    id: string
    profileId: string
    title: string
    description: string | null
    milestones: MilestoneType[]
    createdAt: Date
    updatedAt: Date
}

export type NewRecoveryGoalType = {
    userId: string
    title: string
    description?: string
}

export type UpdateRecoveryGoalType = {
    title?: string
    description?: string
}


export type UpdateMilestoneType = {
    title?: string
    isCompleted?: boolean
}
