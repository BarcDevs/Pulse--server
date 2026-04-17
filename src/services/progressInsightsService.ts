import { minuteInMs } from '../constants/time'
import * as cache from '../lib/cache/progressInsightsCache'
import { calculateDateWindows } from '../lib/progressInsights/dateWindowCalculator'
import { detectHighlights } from '../lib/progressInsights/highlightDetector'
import {
    buildFallbackInsight,
    buildProgressInsight
} from '../lib/progressInsights/insightBuilder'
import {
    computePeriodMetrics
} from '../lib/progressInsights/metricAggregator'
import { resolveSummary } from '../lib/progressInsights/summaryResolver'
import {
    classifyTrend,
    computeDeltas
} from '../lib/progressInsights/trendClassifier'
import * as checkInModel from '../models/checkInModel'
import { getProfileIdForUser } from '../models/checkInModel'
import type { ProgressInsight } from '../types/data/ProgressInsightType'
import logger from '../utils/logger'

const CACHE_TTL_MS = 10 * minuteInMs

const getLastCheckInTimestamp = async (
    profileId: string
): Promise<number> => {
    const checkIns = await checkInModel.getCheckIns(
        profileId,
        1
    )

    if (checkIns.length === 0)
        return 0

    return checkIns[0].updatedAt?.getTime() || 0
}

export const generateProgressInsight = async (
    userId: string
): Promise<ProgressInsight> => {
    const profileId = await getProfileIdForUser(userId)

    const {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
    } = calculateDateWindows()

    const lastCheckInTimestamp = await getLastCheckInTimestamp(
        profileId
    )

    const cached = cache.get(
        userId,
        'week',
        currentStart,
        currentEnd,
        lastCheckInTimestamp
    )

    if (cached) {
        logger.info('Progress insights cache hit', {
            userId,
            cacheHit: true
        })
        return cached
    }

    const currentPeriodCheckIns =
        await checkInModel.getCheckInsForDateRange(
            profileId,
            currentStart,
            currentEnd
        )

    if (currentPeriodCheckIns.length < 2) {
        const fallback = buildFallbackInsight(
            currentStart,
            currentEnd,
            previousStart,
            previousEnd
        )

        cache.set(
            userId,
            'week',
            currentStart,
            currentEnd,
            lastCheckInTimestamp,
            fallback,
            CACHE_TTL_MS
        )

        logger.info('Progress insights insufficient data', {
            userId,
            checkInCount: currentPeriodCheckIns.length,
            usedFallback: true
        })

        return fallback
    }

    const previousPeriodCheckIns =
        await checkInModel.getCheckInsForDateRange(
            profileId,
            previousStart,
            previousEnd
        )

    const currentMetrics = computePeriodMetrics(
        currentPeriodCheckIns
    )

    const previousMetrics = computePeriodMetrics(
        previousPeriodCheckIns
    )

    const deltas = computeDeltas(
        currentMetrics,
        previousMetrics
    )
    const trend = classifyTrend(
        currentMetrics,
        previousMetrics
    )
    const highlights = detectHighlights(deltas, trend)

    const {
        summary,
        usedFallback
    } = await resolveSummary(
        currentMetrics,
        previousMetrics,
        trend
    )

    const insight = buildProgressInsight({
        summary,
        trend,
        highlights,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentMetrics,
        previousMetrics
    })

    cache.set(
        userId,
        'week',
        currentStart,
        currentEnd,
        lastCheckInTimestamp,
        insight,
        CACHE_TTL_MS
    )

    logger.info('Progress insights generated', {
        userId,
        trend,
        moodDelta: deltas.moodDelta,
        painDelta: deltas.painDelta,
        activityDelta: deltas.activityConsistencyDelta,
        highlightsCount: {
            improvements: highlights.improvements.length,
            regressions: highlights.regressions.length
        },
        usedFallback,
        cacheHit: false
    })

    return insight
}
