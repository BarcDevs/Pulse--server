import type { Store } from 'express-rate-limit'
import { MemoryStore } from 'express-rate-limit'

import { createRateLimitStore, ResilientStore } from '../../../lib/redis/rateLimitStore'
import logger from '../../../utils/logger'

jest.mock('../../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))
jest.mock('../../../lib/redis/redisClient', () => ({
    getRedisClient: jest.fn(() => null)
}))

const brokenStore = (): Store => ({
    increment: jest.fn().mockRejectedValue(new Error('connection refused')),
    decrement: jest.fn().mockRejectedValue(new Error('connection refused')),
    resetKey: jest.fn().mockRejectedValue(new Error('connection refused')),
    get: jest.fn().mockRejectedValue(new Error('connection refused'))
})

const memory = () => {
    const store = new MemoryStore()
    store.init({ windowMs: 60_000 } as never)
    return store
}

describe('rate limit store', () => {
    beforeEach(() => jest.clearAllMocks())

    it('is left to the default in-memory store while Redis is off', () => {
        expect(createRateLimitStore('login')).toBeUndefined()
    })

    describe('ResilientStore', () => {
        it('uses the primary store while it answers', async () => {
            const primary = memory()
            const fallback = memory()
            const store = new ResilientStore(primary, fallback)

            await store.increment('ip')
            await store.increment('ip')

            expect((await primary.get('ip'))?.totalHits).toBe(2)
            expect(await fallback.get('ip')).toBeUndefined()
        })

        it('counts in memory and does not throw when the primary store fails', async () => {
            const store = new ResilientStore(brokenStore(), memory())

            await store.increment('ip')
            const third = await (async () => {
                await store.increment('ip')
                return store.increment('ip')
            })()

            expect(third.totalHits).toBe(3)
        })

        it('logs the outage once, not on every request', async () => {
            const store = new ResilientStore(brokenStore(), memory())

            await store.increment('a')
            await store.increment('b')
            await store.decrement('a')
            await store.resetKey('b')

            expect(logger.warn).toHaveBeenCalledTimes(1)
        })
    })
})
