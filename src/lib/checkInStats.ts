import type {CheckInType} from '../types/data/CheckInType'

import {prevDay, toDateStr} from './checkInDateHelpers'

type CheckInStatsData = Pick<
    CheckInType,
    'moodScore' |
    'painLevel' |
    'activities' |
    'checkInDate'
>

const calculateStreaks = (
    dates: Date[]
): {
    currentStreak: number
    longestStreak: number
} => {
    if (dates.length === 0)
        return {
            currentStreak: 0,
            longestStreak: 0
        }

    const uniqueDays = [
        ...new Set(dates.map(toDateStr))
    ].sort().reverse()

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
            if (streak > longestStreak)
                longestStreak = streak
        } else {
            streak = 1
        }
    }

    return {currentStreak, longestStreak}
}

const calculateAverageMood = (
    checkIns: CheckInStatsData[]
): number =>
    checkIns.length > 0
        ? checkIns.reduce(
        (sum, c) => sum + c.moodScore, 0
    ) / checkIns.length
        : 0

const calculateAveragePain = (
    checkIns: CheckInStatsData[]
): number =>
    checkIns.length > 0
        ? checkIns.reduce(
        (sum, c) => sum + c.painLevel, 0
    ) / checkIns.length
        : 0

const calculateTopActivities = (
    checkIns: CheckInStatsData[]
): string[] => {
    const activityCount = checkIns
        .flatMap((c) => c.activities)
        .reduce<Record<string, number>>(
            (acc, activity) => {
                acc[activity] =
                    (acc[activity] || 0) + 1
                return acc
            }, {}
        )

    return Object.entries(activityCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name)
}

export {
    calculateAverageMood,
    calculateAveragePain,
    calculateStreaks,
    calculateTopActivities
}