import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit'
import { MemoryStore } from 'express-rate-limit'
import type { RedisReply } from 'rate-limit-redis'
import RedisStore from 'rate-limit-redis'

import logger from '../../utils/logger'

import { getRedisClient } from './redisClient'

// Counts in Redis while it answers and in this process while it does not, so a
// dead Redis never fails a request and never switches limiting off. Counters
// kept in memory while Redis is down start again from zero when it returns.
export class ResilientStore implements Store {
    private warned = false

    constructor(
        private readonly primary: Store,
        private readonly fallback: Store
    ) {}

    localKeys = false

    init(options: Options) {
        this.primary.init?.(options)
        this.fallback.init?.(options)
    }

    private async withFallback<T>(
        useStore: (store: Store) => Promise<T> | T
    ): Promise<T> {
        try {
            const result = await useStore(this.primary)
            this.warned = false
            return result
        } catch (error) {
            if (!this.warned) {
                this.warned = true
                logger.warn(
                    `Rate limit store: Redis unavailable, counting in memory (${(error as Error).message})`
                )
            }
            return useStore(this.fallback)
        }
    }

    get(key: string): Promise<ClientRateLimitInfo | undefined> {
        return this.withFallback(store => store.get?.(key) as Promise<ClientRateLimitInfo | undefined>)
    }

    increment(key: string): Promise<ClientRateLimitInfo> {
        return this.withFallback(store => store.increment(key))
    }

    decrement(key: string): Promise<void> {
        return this.withFallback(async store => store.decrement(key))
    }

    resetKey(key: string): Promise<void> {
        return this.withFallback(async store => store.resetKey(key))
    }
}

// Undefined when Redis is off, so the limiter keeps its default in-memory store.
// One prefix per limiter keeps their counters apart.
export const createRateLimitStore = (name: string): Store | undefined => {
    const client = getRedisClient()
    if (!client) return undefined

    const primary = new RedisStore({
        prefix: `rl:${name}:`,
        sendCommand: (...args: string[]) =>
            client.call(args[0], ...args.slice(1)) as Promise<RedisReply>
    })

    return new ResilientStore(primary, new MemoryStore())
}
