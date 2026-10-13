import {
    PROFILE_CONTEXT_MAX_ENTRIES,
    PROFILE_CONTEXT_TTL_MS
} from '../../constants/profileContextCache'

export type ProfileContext = {
    id: string
    timezone: string
}

type CacheEntry = {
    value: ProfileContext
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export const get = (userId: string): ProfileContext | undefined => {
    const entry = cache.get(userId)

    if (!entry)
        return undefined

    if (Date.now() > entry.expiresAt) {
        cache.delete(userId)
        return undefined
    }

    return entry.value
}

export const set = (userId: string, value: ProfileContext): void => {
    if (cache.size >= PROFILE_CONTEXT_MAX_ENTRIES)
        cache.clear()

    cache.set(userId, {
        value,
        expiresAt: Date.now() + PROFILE_CONTEXT_TTL_MS
    })
}

export const invalidate = (userId: string): void => {
    cache.delete(userId)
}

export const clearCache = (): void => {
    cache.clear()
}
