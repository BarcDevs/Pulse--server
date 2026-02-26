import * as checkInModel from '../models/CheckInModel'
import type {
    CheckInStatsType,
    CheckInType,
    NewCheckInType
} from '../types/data/CheckInType'
import type { CheckInQuery } from '../types/query'

export const getCheckIns = async (
    userId: string,
    query?: CheckInQuery
): Promise<CheckInType[]> =>
    checkInModel.getCheckIns(userId, query?.limit)

export const createCheckIn = async (
    data: NewCheckInType
): Promise<CheckInType> =>
    checkInModel.createCheckIn(data)

export const getCheckInStats = async (
    userId: string
): Promise<CheckInStatsType> => {
    const checkIns = await checkInModel.getCheckInsForStats(userId)

    const totalCheckIns = checkIns.length

    const averageMoodScore =
        totalCheckIns > 0
            ? checkIns.reduce((sum, c) => sum + c.moodScore, 0) / totalCheckIns
            : 0

    const averagePainLevel =
        totalCheckIns > 0
            ? checkIns.reduce((sum, c) => sum + c.painLevel, 0) / totalCheckIns
            : 0

    const activityCount = checkIns
        .flatMap((c) => c.activities)
        .reduce<Record<string, number>>((acc, activity) => {
            acc[activity] = (acc[activity] || 0) + 1
            return acc
        }, {})

    const topActivities = Object.entries(activityCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name)

    return {
        totalCheckIns,
        averageMoodScore,
        averagePainLevel,
        topActivities,
    }
}