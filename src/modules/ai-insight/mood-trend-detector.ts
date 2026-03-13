import type { CheckInType } from '../../types/data/CheckInType'

const isMoodDropping = (
    checkIns: CheckInType[],
    consecutiveCount: number = 3
): boolean => {
    if (checkIns.length === 0) {
        return false
    }

    // Sort by checkInDate ascending (oldest first) to get chronological order
    const sorted = [...checkIns].sort(
        (a, b) => a.checkInDate.getTime() - b.checkInDate.getTime()
    )

    // Extract the latest N check-ins
    const latestCheckIns = sorted.slice(-consecutiveCount)

    // Filter to only check-ins with valid numeric mood scores
    const validMoodScores = latestCheckIns
        .filter((checkIn) => typeof checkIn.moodScore === 'number')
        .map((checkIn) => checkIn.moodScore)

    // Need at least consecutiveCount valid mood scores to evaluate
    if (validMoodScores.length < consecutiveCount) {
        return false
    }

    // Check if strictly decreasing: each score < previous score
    for (let i = 1; i < validMoodScores.length; i++) {
        if (validMoodScores[i] >= validMoodScores[i - 1]) {
            return false
        }
    }

    return true
}

export { isMoodDropping }
