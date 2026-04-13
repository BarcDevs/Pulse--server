import type { CheckInType } from '../../types/data/CheckInType'

export type PeriodMetrics = {
    averageMood: number
    averagePain: number
    activityConsistency: number
}

export const computePeriodMetrics = (
    checkIns: Pick<
        CheckInType,
        | 'moodScore'
        | 'painLevel'
        | 'activities'
        | 'checkInDate'
    >[]
): PeriodMetrics => {
    if (checkIns.length === 0) {
        return {
            averageMood: 0,
            averagePain: 0,
            activityConsistency: 0
        }
    }

    const totalMood = checkIns.reduce(
        (sum, checkIn) => sum + (checkIn.moodScore ?? 0),
        0
    )
    const averageMood = checkIns.length > 0
        ? totalMood / checkIns.length : 0

    const totalPain = checkIns.reduce(
        (sum, checkIn) => sum + (checkIn.painLevel ?? 0),
        0
    )
    const averagePain = checkIns.length > 0
        ? totalPain / checkIns.length : 0

    const uniqueDays = new Set(
        checkIns.map(c =>
            c.checkInDate.toISOString().split('T')[0]
        )
    )

    const daysWithActivities = new Set(
        checkIns
            .filter(
                c => c.activities && c.activities.length > 0
            )
            .map(c => c.checkInDate.toISOString().split('T')[0])
    ).size

    const activityConsistency =
        daysWithActivities / Math.max(1, uniqueDays.size)

    return {
        averageMood,
        averagePain,
        activityConsistency
    }
}
