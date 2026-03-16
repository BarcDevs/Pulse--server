import type {CheckInType} from '../../../types/data/CheckInType'

const extractRecentActivities = (
    checkIns: CheckInType[],
    limit: number = 6
): string =>
    checkIns
        .flatMap(checkIn => checkIn.activities ?? [])
        .slice(-limit)
        .join(', ')

const calculateAverageMood = (
    checkIns: CheckInType[]
): string => {
    const validMoods = checkIns
        .map(checkIn => checkIn.moodScore)
        .filter((mood): mood is number => true)

    return validMoods.length > 0
        ? (
            validMoods.reduce(
                (sum, mood) => sum + mood, 0) /
            validMoods.length
        ).toFixed(1)
        : 'N/A'
}

const getTopActivities = (
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

const formatMoodTrend = (moodTrend?: number[]): string =>
    moodTrend?.length ? moodTrend.join(' → ') : 'not available'

const formatStreakLine = (currentStreak?: number): string =>
    currentStreak && currentStreak > 0
        ? `Current streak: ${currentStreak} day${currentStreak > 1 ? 's' : ''}`
        : 'The user is just beginning their check-in habit'

const getLatestMood = (checkIns: CheckInType[]): string =>
    checkIns.at(-1)?.moodScore?.toString() ?? 'not available'

export {
    calculateAverageMood,
    extractRecentActivities,
    formatMoodTrend,
    formatStreakLine,
    getLatestMood,
    getTopActivities
}