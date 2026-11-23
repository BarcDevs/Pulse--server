import type {
    ClientRateLimitInfo,
    Options,
    Store
} from 'express-rate-limit'
import { MemoryStore } from 'express-rate-limit'
import type { RedisReply } from 'rate-limit-redis'
import RedisStore from 'rate-limit-redis'

import logger from '../../utils/logger'

import { getRedisClient } from './redisClient'

// Counts in Redis while it answers and in this process while it does not, so a
// dead Redis never fails a request and never switches limiting off. Counters
// kept in memory while Redis is down start again from zero when it returns.
//
// The Redis store is built on first use, once the client is connected. Building
// it while the client is still connecting makes it load its Lua script too early
// (the client has no offline queue) and that rejection reached nobody, which
// stopped the process at start-up.
export class ResilientStore implements Store {
    private warned = false
    private primary: Store | null = null
    private options: Options | null = null

    constructor(
        private readonly createPrimary: () => Store | null,
        private readonly fallback: Store
    ) {}

    localKeys = false

    init(options: Options) {
        this.options = options
        this.fallback.init?.(options)
    }

    // Null while Redis is not usable; the caller then counts in memory.
    private async getPrimary(): Promise<Store | null> {
        if (this.primary) return this.primary

        const store = this.createPrimary()
        if (!store) return null

        try {
            if (this.options) await store.init?.(this.options)
        } catch (error) {
            this.warn(error as Error)

            return null
        }

        this.primary = store

        return store
    }

    private warn(error: Error) {
        if (this.warned) return

        this.warned = true
        logger.warn(
            `Rate limit store: Redis unavailable, counting in memory (${error.message})`
        )
    }

    private async withFallback<T>(
        useStore: (store: Store) => Promise<T> | T
    ): Promise<T> {
        try {
            const primary = await this.getPrimary()

            if (primary) {
                const result = await useStore(primary)
                this.warned = false

                return result
            }
        } catch (error) {
            this.warn(error as Error)
        }

        return useStore(this.fallback)
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

    const createPrimary = (): Store | null => {
        if (client.status !== 'ready') return null

        return new RedisStore({
            prefix: `rl:${name}:`,
            sendCommand: (...args: string[]) =>
                client.call(args[0], ...args.slice(1)) as Promise<RedisReply>
        })
    }

    return new ResilientStore(createPrimary, new MemoryStore())
}
