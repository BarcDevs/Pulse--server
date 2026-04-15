import type { CheckInType } from '../../types/data/CheckInType'
import type { CheckInState } from '../../types/data/RecommendationType'
import { calculateCurrentStreak } from '../aiInsight'

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for',
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'that', 'the', 'to', 'was', 'will', 'with', 'but', 'this', 'have',
    'i', 'you', 'we', 'they', 'what', 'when', 'where', 'why', 'how'
])

const extractKeywordsFromText = (text: string): string[] => {
    if (!text) return []

    return text
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
}

export const buildCheckInState = (
    current: CheckInType,
    previous?: CheckInType,
    checkInHistory?: CheckInType[],
    daysSinceFirstCheckIn?: number
): CheckInState => {
    // Physical state from pain level
    const physicalState = current.painLevel <= 3
        ? 'good'
        : current.painLevel <= 6
            ? 'moderate'
            : 'poor'

    // Emotional state from mood score
    const emotionalState = current.moodScore >= 7
        ? 'positive'
        : current.moodScore >= 4
            ? 'neutral'
            : 'negative'

    // Key issue tags from activities + notes
    const keyIssueTags = new Set([
        ...current.activities.map((a) => a.toLowerCase()),
        ...extractKeywordsFromText(current.notes || '')
    ])

    // Trend detection
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (previous) {
        const moodDelta = current.moodScore - previous.moodScore
        const painDelta = previous.painLevel - current.painLevel
        const weightedDelta = (moodDelta + painDelta) / 2

        if (weightedDelta > 0) trend = 'improving'
        else if (weightedDelta < 0) trend = 'declining'
    }

    // Recovery stage - hybrid with hysteresis
    let recoveryStage: 'early' | 'mid' | 'advanced' = 'mid'

    const streak = checkInHistory
        ? calculateCurrentStreak(
            checkInHistory.map((c) => c.checkInDate)
        )
        : 0

    const isEarlyStage = streak <= 2 && (daysSinceFirstCheckIn ?? 0) < 14
    const isAdvancedStage = streak >= 7 && trend === 'improving'

    if (isEarlyStage) recoveryStage = 'early'
    else if (isAdvancedStage) recoveryStage = 'advanced'

    return {
        physicalState,
        emotionalState,
        recoveryStage,
        keyIssueTags: Array.from(keyIssueTags),
        trend
    }
}
