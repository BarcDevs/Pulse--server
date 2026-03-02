import type {InsightType} from '../../../prisma/generated/prisma/enums'

export type AIInsightType = {
    id: string
    checkInId: string
    type: InsightType
    content: string
    createdAt: Date
}

export type CheckInType = {
    id: string
    userId: string
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

export type UpsertCheckInResult = {
    checkIn: CheckInType
    created: boolean
}

export type CheckInStatsType = {
    totalCheckIns: number
    averageMoodScore: number
    averagePainLevel: number
    topActivities: string[]
    currentStreak: number
    longestStreak: number
}