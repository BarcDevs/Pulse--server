import type { CheckInType } from '../../../types/data/CheckInType'
import type { InsightStats } from '../../../types/insight'

// Check-ins arrive newest first from the database, so pick the newest by date instead of by position.
const getNewestCheckIn = (checkIns: CheckInType[]): CheckInType | undefined =>
    [...checkIns].sort(
        (a, b) => b.checkInDate.getTime() - a.checkInDate.getTime()
    )[0]

// The database returns check-ins newest first, so "the last N" must be chosen by date, not by position.
const oldestFirst = (checkIns: CheckInType[]): CheckInType[] =>
    [...checkIns].sort(
        (a, b) => a.checkInDate.getTime() - b.checkInDate.getTime()
    )

export const extractRecentActivities = (
    checkIns: CheckInType[],
    limit: number = 6
): string =>
    oldestFirst(checkIns)
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

export const formatStreakLine = (
    currentStreak?: number,
    longestStreak?: number
): string =>
    currentStreak && currentStreak > 0
        ? `Current streak: ${currentStreak} day${currentStreak > 1 ? 's' : ''}${longestStreak ? ` (best streak: ${longestStreak} days)` : ''}`
        : 'The user is just beginning their check-in habit'

export const getLatestMood = (checkIns: CheckInType[]): string =>
    getNewestCheckIn(checkIns)?.moodScore?.toString() ?? 'not available'

export const extractRecentNotes = (
    checkIns: CheckInType[],
    limit: number = 5
): string =>
    oldestFirst(checkIns)
        .map(checkIn => checkIn.notes?.trim())
        .filter((note): note is string => Boolean(note))
        .slice(-limit)
        .join(' | ')

export const calculateAveragePain = (
    checkIns: CheckInType[]
): string => {
    if (checkIns.length === 0) {
        return 'N/A'
    }

    const sum = checkIns.reduce(
        (acc, checkIn) => acc + checkIn.painLevel,
        0
    )

    return (sum / checkIns.length).toFixed(1)
}

export const formatWeeklyStatsLines = (
    checkIns: CheckInType[],
    stats: InsightStats
): string => {
    const newest = getNewestCheckIn(checkIns)
    const lines = [
        stats.totalCheckIns
            ? `- Total check-ins so far: ${stats.totalCheckIns}`
            : '',
        `- Average pain this week: ${calculateAveragePain(checkIns)}`,
        newest
            ? `- Latest check-in (today): mood ${newest.moodScore}, pain ${newest.painLevel}`
            : ''
    ].filter(Boolean)

    return lines.map((line) => `${line}
`).join('')
}
