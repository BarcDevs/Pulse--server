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

    const direction = determineTrendDirection(current, history)
    const highlights = extractHighlights(recentCheckIns, current)

    return {
        recentCheckIns,
        trend: {
            direction,
            duration: trendDuration
        },
        highlights
    }
}

// Determine trend direction: up (improving), down (worsening), or stable
const determineTrendDirection = (
    current: CheckInType,
    history: CheckInType[]
): 'up' | 'down' | 'stable' => {
    if (history.length === 0) {
        return 'stable'
    }

    const baselineMood = calculateBaselineMood(history)
    const baselinePain = calculateBaselinePain(history)

    const moodDelta = current.moodScore - baselineMood
    const painDelta = current.painLevel - baselinePain

    // Threshold of 1.5 points to determine significant change
    const threshold = 1.5

    if (moodDelta >= threshold || painDelta <= -threshold) {
        return 'up'
    }

    if (moodDelta <= -threshold || painDelta >= threshold) {
        return 'down'
    }

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
