import type { ObservationType } from '../../types/data/DailyObservationType'
import { calculateCurrentStreak } from '../aiInsight/decision/streakCalculator'

type CheckInStats = {
    moodScore: number
    painLevel: number
    activities: string[]
    checkInDate: Date
}

export type DetectionResult = {
    type: ObservationType
    metadata?: Record<string, unknown>
}

const average = (values: number[]): number =>
    values.length === 0 ? 0 : values
        .reduce((a, b) => a + b, 0) / values.length

// Every pattern the recent check-ins show, in priority order. Nothing is hidden behind an earlier rule.
export const detectAllObservationTypes = (
    checkIns: CheckInStats[]
): DetectionResult[] => {
    const results: DetectionResult[] = []
    const last5 = checkIns.slice(0, 5)

    // 1. activity_consistency
    if (last5.length >= 5) {
        const withActivities = last5
            .filter(c => c.activities.length > 0).length
        if (withActivities >= 3) {
            results.push({
                type: 'activity_consistency',
                metadata: {
                    recentActivityCheckIns: withActivities,
                    evaluatedCheckIns: last5.length
                }
            })
        }
    }

    // 2. pain_improvement
    const recentPain = checkIns.slice(0, 5).map(c => c.painLevel)
    const previousPain = checkIns.slice(5, 10).map(c => c.painLevel)
    if (recentPain.length === 5 && previousPain.length === 5) {
        const recentAvg = average(recentPain)
        const prevAvg = average(previousPain)
        if (recentAvg < prevAvg) {
            results.push({
                type: 'pain_improvement',
                metadata: {
                    recentAveragePain: parseFloat(recentAvg.toFixed(2)),
                    previousAveragePain: parseFloat(prevAvg.toFixed(2))
                }
            })
        }
    }

    // 3. better_days_pattern
    if (last5.length >= 5) {
        const betterDays = last5
            .filter(
                c => c.moodScore >= 7 && c.painLevel <= 4
            ).length
        if (betterDays >= 3) {
            results.push({
                type: 'better_days_pattern',
                metadata: {
                    betterDayCount: betterDays,
                    evaluatedCheckIns: last5.length
                }
            })
        }
    }

    // 4. mood_stability
    if (last5.length >= 5) {
        const moods = last5.map(c => c.moodScore)
        const moodRange = Math.max(...moods) - Math.min(...moods)
        if (moodRange <= 2) {
            results.push({
                type: 'mood_stability',
                metadata: {
                    moodRange,
                    evaluatedCheckIns: last5.length
                }
            })
        }
    }

    // 5. streak_consistency
    const dates = checkIns.map(c => c.checkInDate)
    if (dates.length > 0) {
        const streak = calculateCurrentStreak(dates)
        if (streak >= 5) {
            results.push({
                type: 'streak_consistency',
                metadata: { streak }
            })
        }
    }

    // 6. checkin_consistency: generic engagement note, only when nothing more specific applies
    if (results.length === 0 && checkIns.length >= 10) {
        results.push({
            type: 'checkin_consistency',
            metadata: { checkInCount: checkIns.length }
        })
    }

    return results
}

// One observation per day. The caller passes a number that changes daily (days since epoch), so
// every pattern that applies gets its turn instead of the first rule always winning.
export const detectObservationType = (
    checkIns: CheckInStats[],
    rotation: number = 0
): DetectionResult | null => {
    const results = detectAllObservationTypes(checkIns)
    if (results.length === 0) return null

    return results[Math.abs(Math.trunc(rotation)) % results.length]
}
