import {dayInMs} from '../../../constants/time'

const calculateCurrentStreak = (
    checkInDates: Date[],
    timezone?: string
): number => {
    if (checkInDates.length === 0) {
        return 0
    }

    // De-duplicate by calendar day (user's timezone)
    const uniqueDates = new Set<string>()
    const uniqueDateObjects: Date[] = []

    for (const date of checkInDates) {
        const dateString = timezone ?
            new Intl.DateTimeFormat(
                'en-CA',
                {timeZone: timezone}
            ).format(date) :
            date.toISOString().split('T')[0]

        if (!uniqueDates.has(dateString)) {
            uniqueDates.add(dateString)
            uniqueDateObjects.push(date)
        }
    }

    if (uniqueDateObjects.length === 0) {
        return 0
    }

    // Sort descending (most recent first)
    const sorted = [...uniqueDateObjects].sort(
        (a, b) => b.getTime() - a.getTime()
    )

    // Count consecutive days backwards from most recent
    let streak = 1

    for (let i = 1; i < sorted.length; i++) {
        const currentDate = sorted[i]
        const expectedPreviousDate = new Date(
            sorted[i - 1].getTime() - dayInMs
        )

        // Check if current date is exactly 1 day before the previous date
        const currentDateString = currentDate
            .toISOString().split('T')[0]
        const expectedDateString = expectedPreviousDate
            .toISOString()
            .split('T')[0]

        if (currentDateString === expectedDateString) {
            streak++
        } else {
            break
        }
    }

    return streak
}

export { calculateCurrentStreak }
