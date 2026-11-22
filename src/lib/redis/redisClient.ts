import type { RedisOptions } from 'ioredis'
import Redis from 'ioredis'

import { redisConfig } from '../../../config'
import logger from '../../utils/logger'

let client: Redis | null = null

export const isRedisEnabled = (): boolean => redisConfig.host !== ''

// A cache must never hold a request: no offline queue, one try per command and
// a short timeout, so a dead Redis costs a few hundred ms at most and the
// caller falls back.
export const buildRedisOptions = (): RedisOptions => ({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password || undefined,
    keyPrefix: redisConfig.keyPrefix,
    connectTimeout: redisConfig.connectTimeoutMs,
    commandTimeout: redisConfig.commandTimeoutMs,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000)
})

// Null when Redis is off. The client reconnects by itself; errors are logged
// once per outage by the 'error' handler, never thrown into a request.
export const getRedisClient = (): Redis | null => {
    if (!isRedisEnabled()) return null

    if (!client) {
        client = new Redis(buildRedisOptions())
        client.on('error', (error) => {
            logger.warn(`Redis error: ${error.message}`)
        })
    }

    return client
}

export const closeRedisClient = async (): Promise<void> => {
    if (!client) return
    const closing = client
    client = null
    await closing.quit().catch(() => closing.disconnect())
}
