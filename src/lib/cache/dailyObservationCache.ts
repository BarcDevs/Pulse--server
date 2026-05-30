import { dayInMs } from '../../constants/time'
import type { TodayObservationResponse } from '../../types/data/DailyObservationType'
import { resolveCheckInDate, toDateStr } from '../checkInDateHelpers'

type CacheEntry = {
    value: TodayObservationResponse | null
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const msUntilLocalMidnight = (
    timezone: string | null
): number => {
    if (!timezone)
        // eslint-disable-next-line custom-rules/enforce-function-call-breaking
        return new Date().setUTCHours(24, 0, 0, 0)
            - Date.now()

    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(now)

    const getPartValue = (type: string) =>
        parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)

    let hours = getPartValue('hour')
    if (hours === 24) hours = 0
    const minutes = getPartValue('minute')
    const seconds = getPartValue('second')

    const totalSeconds = (hours * 60 + minutes) * 60 + seconds
    const msElapsed = totalSeconds * 1000 + now.getMilliseconds()
    return dayInMs - msElapsed
}

const buildCacheKey = (
    userId: string,
    timezone: string | null
): string =>
    `${userId}:${toDateStr(
        resolveCheckInDate(timezone)
    )}`

export const get = (
    userId: string,
    timezone: string | null
): TodayObservationResponse
    | null
    | undefined => {
    const key = buildCacheKey(userId, timezone)
    const entry = cache.get(key)

    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
        cache.delete(key)
        return undefined
    }

    return entry.value
}

export const set = (
    userId: string,
    timezone: string | null,
    value: TodayObservationResponse | null
): void => {
    const key = buildCacheKey(userId, timezone)
    const ttlMs = msUntilLocalMidnight(timezone)

    cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
    })

    cleanExpiredEntries()
}

const cleanExpiredEntries = (): void => {
    const now = Date.now()

    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt)
            cache.delete(key)
    }
}

export const clearCache = (): void => {
    cache.clear()
}
