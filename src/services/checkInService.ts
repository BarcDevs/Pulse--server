import * as checkInModel from '../models/CheckInModel'
import type {
    CheckInStatsType,
    CheckInType,
    NewCheckInType
} from '../types/data/CheckInType'
import type {CheckInQuery} from '../types/query'

const toDateStr = (d: Date): string => d.toISOString().slice(0, 10)

const prevDay = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    return toDateStr(d)
}

const calculateStreaks = (
    dates: Date[]
): {currentStreak: number; longestStreak: number} => {
    if (dates.length === 0) return {currentStreak: 0, longestStreak: 0}

    const uniqueDays = [...new Set(dates.map(toDateStr))].sort().reverse()

    const today = toDateStr(new Date())
    const yesterday = prevDay(today)

    let currentStreak = 0
    if (
        uniqueDays[0] === today ||
        uniqueDays[0] === yesterday
    ) {
        currentStreak = 1
        let cursor = uniqueDays[0]
        for (let i = 1; i < uniqueDays.length; i++) {
            if (uniqueDays[i] === prevDay(cursor)) {
                currentStreak++
                cursor = uniqueDays[i]
            } else {
                break
            }
        }
    }

    let longestStreak = 1
    let streak = 1
    for (let i = 1; i < uniqueDays.length; i++) {
        if (uniqueDays[i] === prevDay(uniqueDays[i - 1])) {
            streak++
            if (streak > longestStreak) longestStreak = streak
        } else {
            streak = 1
        }
    }

    return {currentStreak, longestStreak}
}

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

    const {currentStreak, longestStreak} = calculateStreaks(
        checkIns.map((c) => c.createdAt)
    )

    return {
        totalCheckIns,
        averageMoodScore,
        averagePainLevel,
        topActivities,
        currentStreak,
        longestStreak
    }
}