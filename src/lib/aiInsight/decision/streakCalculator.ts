import { dayInMs } from '../../../constants/time'
import { toLocalDateStr } from '../../checkInDateHelpers'

/**
 * Calculates consecutive day streak from most recent date backwards.
 * De-duplicates by calendar day (ignores time component).
 *
 * @param checkInDates - Array of Date objects (order irrelevant, sorted internally)
 * @param timezone - Optional timezone string (e.g., 'America/Los_Angeles'). Defaults to UTC.
 * @returns Number of consecutive calendar days from most recent backwards, or 0 if empty
 *
 * @example
 * calculateCurrentStreak([
 *   new Date('2026-03-10T15:00:00Z'),
 *   new Date('2026-03-09T08:00:00Z'),
 *   new Date('2026-03-08T22:00:00Z')
 * ]) // returns 3
 */
export const calculateCurrentStreak = (
    checkInDates: Date[],
    timezone?: string
): number => {
    if (checkInDates.length === 0) {
        return 0
    }

    // Collect unique calendar-day strings (YYYY-MM-DD) in the user's timezone
    const uniqueDateStrings = new Set<string>()
    for (const date of checkInDates) {
        const dateString = toLocalDateStr(date, timezone)
        uniqueDateStrings.add(dateString)
    }

    // Sort descending (most recent first) — YYYY-MM-DD sorts lexicographically
    const sorted = [...uniqueDateStrings].sort(
        (a, b) => (b > a ? 1 : b < a ? -1 : 0)
    )

    // Count consecutive days backwards from most recent
    let streak = 1
    for (let i = 1; i < sorted.length; i++) {
        const diff = (
            new Date(sorted[i - 1] + 'T00:00:00Z').getTime()
            - new Date(sorted[i] + 'T00:00:00Z').getTime()
        )
        if (diff === dayInMs) {
            streak++
        } else {
            break
        }
    }

    return streak
}