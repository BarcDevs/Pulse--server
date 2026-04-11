import type { CheckInType } from '../../types/data/CheckInType'

export const calculateBaselineMood = (
    history: CheckInType[]
): number => {
    if (history.length === 0) return 0

    const slice = history.slice(0, Math.min(10, history.length))
    const sum = slice.reduce((acc, c) => acc + c.moodScore, 0)
    return sum / slice.length
}

export const calculateBaselinePain = (
    history: CheckInType[]
): number => {
    if (history.length === 0) return 0

    const slice = history.slice(0, Math.min(10, history.length))
    const sum = slice.reduce((acc, c) => acc + c.painLevel, 0)
    return sum / slice.length
}

export const calculateTrendDuration = (
    history: CheckInType[],
    current: CheckInType
): number => {
    // Safety check: ensure current has valid state indicators
    if (
        current.moodScore == null
        || current.painLevel == null
    )
        return 0

    let count = 1

    for (const prev of history) {
        // Safety: ensure prev has valid state indicators
        if (
            prev.moodScore === null
            || prev.painLevel === null
        )
            continue

        const isSimilarState = (
            (prev.moodScore <= 3 || prev.painLevel >= 7)
            && (current.moodScore <= 3 || current.painLevel >= 7)
        )

        if (isSimilarState)
            count++
        else
            break
    }

    // Ensure always returns valid positive integer
    return Math.max(1, count)
}

export const isFirstCheckIn = (history: CheckInType[]): boolean =>
    history.length === 0
