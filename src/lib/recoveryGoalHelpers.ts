import { dayInMs } from '../constants/time'

export const calculateConsecutiveDayStreak = (
    dates: Date[]
): number => {
    if (dates.length === 0) return 0

    const uniqueDays = new Set<string>()
    dates.forEach((date) => {
        const day = new Date(date)
            .toISOString()
            .split('T')[0]
        uniqueDays.add(day)
    })

    if (uniqueDays.size === 0) return 0

    const sortedDays = Array.from(uniqueDays)
        .map(
            (day) => new Date(`${day}T00:00:00Z`)
        )
        .sort((a, b) => b.getTime() - a.getTime())

    let streak = 1

    for (let i = 0; i < sortedDays.length - 1; i++) {
        const diff = sortedDays[i].getTime()
            - sortedDays[i + 1].getTime()
        if (diff === dayInMs) {
            streak += 1
        } else {
            break
        }
    }

    return streak
}
