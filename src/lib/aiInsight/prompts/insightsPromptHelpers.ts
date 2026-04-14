import type { CheckInType } from '../../../types/data/CheckInType'

export const extractRecentActivities = (
    checkIns: CheckInType[],
    limit: number = 6
): string =>
    checkIns
        .flatMap(checkIn => checkIn.activities ?? [])
        .slice(-limit)
        .join(', ')

export const calculateAverageMood = (
    checkIns: CheckInType[]
): string => {
    if (checkIns.length === 0) {
        return 'N/A'
    }

    const sum = checkIns.reduce(
        (acc, checkIn) => acc + checkIn.moodScore,
        0
    )

    return (sum / checkIns.length).toFixed(1)
}

export const getTopActivities = (
    checkIns: CheckInType[],
    limit: number = 3
): string => {
    const activities = checkIns
        .flatMap(checkIn => checkIn.activities ?? [])
        .reduce<Record<string, number>>((acc, activity) => {
            acc[activity] = (acc[activity] || 0) + 1
            return acc
        }, {})

    return Object.entries(activities)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit)
        .map(([name]) => name)
        .join(', ')
}

export const formatMoodTrend = (moodTrend?: number[]): string =>
    moodTrend?.length ? moodTrend.join(' → ') : 'not available'

export const formatStreakLine = (currentStreak?: number): string =>
    currentStreak && currentStreak > 0
        ? `Current streak: ${currentStreak} day${currentStreak > 1 ? 's' : ''}`
        : 'The user is just beginning their check-in habit'

export const getLatestMood = (checkIns: CheckInType[]): string =>
    checkIns.at(-1)?.moodScore?.toString() ?? 'not available'