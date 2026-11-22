import logger from '../../utils/logger'

import { getRedisClient } from './redisClient'

// Cache-aside on Redis. Every key gets an expiry, because the container evicts
// with allkeys-lru and a key that cannot expire has no place in it. Redis is
// only ever a shortcut: when it is off, not connected or fails, the loader
// (the database) answers, and no error reaches the caller.

let warned = false

const warnOnce = (message: string) => {
    if (warned) return
    warned = true
    logger.warn(`Redis cache: ${message}, reading from the database`)
}

export const cacheAside = async <T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T | null>
): Promise<T | null> => {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw new Error(`Cache key ${key} needs a positive whole number of seconds as its expiry`)
    }

    const client = getRedisClient()
    if (client?.status !== 'ready') return load()

    try {
        const cached = await client.get(key)
        if (cached !== null) {
            warned = false
            return JSON.parse(cached) as T
        }
    } catch (error) {
        warnOnce((error as Error).message)
        return load()
    }

    const value = await load()

    if (value !== null && value !== undefined) {
        client.set(
            key,
            JSON.stringify(value),
            'EX',
            ttlSeconds
        ).catch((error: Error) => {
            warnOnce(error.message)
        })
    }

    return value
}

export const invalidateCache = async (key: string): Promise<void> => {
    const client = getRedisClient()
    if (client?.status !== 'ready') return

    try {
        await client.del(key)
    } catch (error) {
        warnOnce((error as Error).message)
    }
}
