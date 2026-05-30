import type { TodayObservationResponse } from '../../types/data/DailyObservationType'

type CacheEntry = {
    value: TodayObservationResponse | null
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const getLocalDateString = (timezone: string | null): string => {
    if (!timezone) return new Date().toISOString().split('T')[0]
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

const msUntilLocalMidnight = (timezone: string | null): number => {
    if (!timezone) return new Date().setUTCHours(
        24,
        0,
        0,
        0
    ) - Date.now()

    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(now)

    const get = (type: string) =>
        parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)

    let hours = get('hour')
    if (hours === 24) hours = 0
    const minutes = get('minute')
    const seconds = get('second')

    const msElapsed = ((hours * 60 + minutes) * 60 + seconds) * 1000 + now.getMilliseconds()
    return 24 * 60 * 60 * 1000 - msElapsed
}

const buildCacheKey = (userId: string, timezone: string | null): string =>
    `${userId}:${getLocalDateString(timezone)}`

export const get = (
    userId: string,
    timezone: string | null
): TodayObservationResponse | null | undefined => {
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
        if (now > entry.expiresAt) {
            cache.delete(key)
        }
    }
}

export const clear = (): void => {
    cache.clear()
}
