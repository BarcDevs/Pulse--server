import { FEEDBACK_DETECTION } from '../../constants/feedback/detection'
import { dayInMs } from '../../constants/time'
import type { CheckInType } from '../../types/data/CheckInType'
import type { InterventionContext } from '../../types/feedback'

import {
    calculateBaselineMood,
    calculateBaselinePain
} from './helpers'

export const buildInterventionContext = (
    current: CheckInType,
    history: CheckInType[],
    trendDuration: number
): InterventionContext => {
    const recentCheckIns = [current, ...history].slice(0, 7)
    const gapDays = calculateMaxGapDays(recentCheckIns)

    const direction = determineTrendDirection(
        current,
        history,
        gapDays
    )
    const highlights = extractHighlights(recentCheckIns, current)

    return {
        recentCheckIns,
        trend: {
            direction,
            duration: trendDuration,
            gapDays
        },
        highlights
    }
}

// Largest gap, in days, between consecutive check-ins (newest-first order)
const calculateMaxGapDays = (checkIns: CheckInType[]): number => {
    let maxGap = 0

    for (let i = 0; i < checkIns.length - 1; i++) {
        const gapMs = checkIns[i].checkInDate.getTime()
            - checkIns[i + 1].checkInDate.getTime()
        const gapDays = Math.round(gapMs / dayInMs)

        if (gapDays > maxGap) maxGap = gapDays
    }

    return maxGap
}

const determineTrendDirection = (
    current: CheckInType,
    history: CheckInType[],
    gapDays: number
): 'up' | 'down' | 'stable' => {
    if (history.length === 0) {
        return 'stable'
    }

    if (gapDays >= FEEDBACK_DETECTION.TREND.GAP_DAYS_THRESHOLD) {
        return 'stable'
    }

    const baselineMood = calculateBaselineMood(history)
    const baselinePain = calculateBaselinePain(history)

    const moodDelta = current.moodScore - baselineMood
    const painDelta = current.painLevel - baselinePain

    const significanceThreshold =
        FEEDBACK_DETECTION.TREND.SIGNIFICANCE_THRESHOLD

    if (
        moodDelta >= significanceThreshold
        || painDelta <= -significanceThreshold
    ) return 'up'

    if (
        moodDelta <= -significanceThreshold
        || painDelta >= significanceThreshold
    ) return 'down'

    return 'stable'
}

// Extract meaningful patterns from recent check-ins
const extractHighlights = (
    recentCheckIns: CheckInType[],
    current: CheckInType
): Array<{
    type: 'consistency' | 'spike' | 'drop' | 'recovery'
    value: number
}> => {
    const highlights: Array<{
        type: 'consistency' | 'spike' | 'drop' | 'recovery'
        value: number
    }> = []

    if (recentCheckIns.length < 2) {
        return highlights
    }

    // Check for consistency: multiple similar low mood values
    const lowMoodCount = recentCheckIns.filter(
        c => c.moodScore <= 3
    ).length
    if (lowMoodCount >= 3) {
        highlights.push({
            type: 'consistency',
            value: lowMoodCount
        })
    }

    // Check for pain spike: current pain significantly higher
    const previousPainValues = recentCheckIns.slice(1).map(c => c.painLevel)
    const avgPrevPain = previousPainValues.length > 0
        ? previousPainValues.reduce((a, b) => a + b, 0) / previousPainValues.length
        : current.painLevel

    if (current.painLevel >= avgPrevPain + 2) {
        highlights.push({
            type: 'spike',
            value: current.painLevel
        })
    }

    // Check for mood drop: current mood significantly lower
    const previousMoodValues = recentCheckIns.slice(1).map(c => c.moodScore)
    const avgPrevMood = previousMoodValues.length > 0
        ? previousMoodValues.reduce((a, b) => a + b, 0) / previousMoodValues.length
        : current.moodScore

    if (current.moodScore <= avgPrevMood - 2) {
        highlights.push({
            type: 'drop',
            value: current.moodScore
        })
    }

    // Check for recovery attempt: mood improving despite recent struggles
    if (recentCheckIns.length >= 3) {
        const prev2 = recentCheckIns[1]
        const prev3 = recentCheckIns[2]

        if (
            prev3.moodScore <= 3
            && prev2.moodScore <= 3
            && current.moodScore > prev2.moodScore
        ) {
            highlights.push({
                type: 'recovery',
                value: current.moodScore
            })
        }
    }

    return highlights
}
