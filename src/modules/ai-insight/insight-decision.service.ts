import type { CheckInType } from '../../types/data/CheckInType'

import type {
    InsightDecisionMetadata,
    InsightDecisionResult,
} from './insight.types'
import { isMoodDropping } from './mood-trend-detector'
import { calculateCurrentStreak } from './streak-calculator'

class InvalidInsightInputError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InvalidInsightInputError'
    }
}

const decideInsightType = (
    checkIns: CheckInType[]
): InsightDecisionResult => {
    // Validate: at least one check-in with valid checkInDate
    if (checkIns.length === 0) {
        throw new InvalidInsightInputError(
            'checkIns array cannot be empty; this service requires at least one valid check-in'
        )
    }

    // Filter to only check-ins with valid checkInDate
    const validCheckIns = checkIns.filter((checkIn) => {
        return (
            checkIn.checkInDate instanceof Date &&
            !isNaN(checkIn.checkInDate.getTime())
        )
    })

    // Fail fast if current/latest check-in is invalid or if no valid check-ins remain
    if (validCheckIns.length === 0) {
        throw new InvalidInsightInputError(
            'No valid check-ins with valid checkInDate found in input'
        )
    }

    // Sort by checkInDate ascending (oldest first)
    const sorted = [...validCheckIns].sort(
        (a, b) => a.checkInDate.getTime() - b.checkInDate.getTime()
    )

    // Rule 1: Check Mood Drop Alert (highest priority)
    if (isMoodDropping(sorted, 3)) {
        const latestThree = sorted.slice(-3)
        const moodTrend = latestThree.map((ci) => ci.moodScore)

        const metadata: InsightDecisionMetadata = {
            moodTrend,
            checkInCount: sorted.length,
        }

        return {
            type: 'MOOD_DROP_ALERT',
            reason: 'Mood decreased across the latest 3 check-ins',
            metadata,
        }
    }

    // Calculate current streak for next rules
    const currentStreak = calculateCurrentStreak(
        sorted.map((ci) => ci.checkInDate)
    )

    // Rule 2: Check Motivational (medium priority - low streak)
    if (currentStreak < 2) {
        const metadata: InsightDecisionMetadata = {
            currentStreak,
            checkInCount: sorted.length,
        }

        return {
            type: 'MOTIVATIONAL',
            reason: 'User has not yet established a consistent check-in streak',
            metadata,
        }
    }

    // Rule 3: Check Weekly Summary (lower priority - sufficient data)
    if (sorted.length >= 5) {
        const metadata: InsightDecisionMetadata = {
            currentStreak,
            checkInCount: sorted.length,
        }

        return {
            type: 'WEEKLY_SUMMARY',
            reason: 'User has enough recent check-in data for a useful summary',
            metadata,
        }
    }

    // Rule 4: Fallback to Motivational (not enough data for weekly summary)
    const metadata: InsightDecisionMetadata = {
        currentStreak,
        checkInCount: sorted.length,
    }

    return {
        type: 'MOTIVATIONAL',
        reason: 'Not enough data yet for a weekly summary',
        metadata,
    }
}

export {
    decideInsightType,
    InvalidInsightInputError
}
