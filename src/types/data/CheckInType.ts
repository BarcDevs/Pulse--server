import type {InsightType} from '../../../prisma/generated/prisma/enums'

export type AIInsightType = {
    id: string
    userId: string
    checkInId: string
    type: InsightType
    title: string
    content: string
    metadata: Record<string, unknown> | null
    createdAt: Date
}

export type CheckInType = {
    id: string
    profileId: string
    checkInDate: Date
    moodScore: number
    painLevel: number
    activities: string[]
    notes?: string | null
    createdAt: Date
    updatedAt?: Date | null
    insights: AIInsightType[]
}

export type NewCheckInType = {
    userId: string
    moodScore: number
    painLevel: number
    activities: string[]
    notes?: string
}

export type CheckInDataType = {
    profileId: string
    moodScore: number
    painLevel: number
    activities: string[]
    notes?: string
}

export type UpdateCheckInType = {
    userId: string
    moodScore?: number
    painLevel?: number
    activities?: string[]
    notes?: string | null
}

export type CheckInStatsType = {
    totalCheckIns: number
    averageMoodScore: number
    averagePainLevel: number
    topActivities: string[]
    currentStreak: number
    longestStreak: number
}