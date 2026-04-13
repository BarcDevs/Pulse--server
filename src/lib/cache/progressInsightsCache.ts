import type { ProgressInsight } from '../../types/data/ProgressInsightType'

type CacheEntry = {
    insight: ProgressInsight
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const buildCacheKey = (
    userId: string,
    timeWindow: string,
    windowStart: Date,
    windowEnd: Date,
    lastCheckInTimestamp: number
): string => {
    const startStr = windowStart.getTime()
    const endStr = windowEnd.getTime()
    return `${userId}:${timeWindow}:${startStr}:${endStr}:${lastCheckInTimestamp}`
}

export const get = (
    userId: string,
    timeWindow: string,
    windowStart: Date,
    windowEnd: Date,
    lastCheckInTimestamp: number
): ProgressInsight | null => {
    const key = buildCacheKey(
        userId,
        timeWindow,
        windowStart,
        windowEnd,
        lastCheckInTimestamp
    )
    const entry = cache.get(key)

    if (!entry)
        return null

    if (Date.now() > entry.expiresAt) {
        cache.delete(key)
        return null
    }

    return entry.insight
}

export const set = (
    userId: string,
    timeWindow: string,
    windowStart: Date,
    windowEnd: Date,
    lastCheckInTimestamp: number,
    insight: ProgressInsight,
    ttlMs: number
): void => {
    const key = buildCacheKey(
        userId,
        timeWindow,
        windowStart,
        windowEnd,
        lastCheckInTimestamp
    )

    const entry: CacheEntry = {
        insight,
        expiresAt: Date.now() + ttlMs
    }

    cache.set(key, entry)

    cleanExpiredEntries()
}

const cleanExpiredEntries = (): void => {
    const now = Date.now()

    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
            cache.delete(key)
        }
    }
}

export const clear = (): void => {
    cache.clear()
}
