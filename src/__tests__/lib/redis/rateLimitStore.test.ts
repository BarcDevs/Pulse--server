import type { Options, Store } from 'express-rate-limit'
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

const options = { windowMs: 60_000 } as Options

const brokenStore = (): Store => ({
    init: jest.fn(),
    increment: jest.fn().mockRejectedValue(new Error('connection refused')),
    decrement: jest.fn().mockRejectedValue(new Error('connection refused')),
    resetKey: jest.fn().mockRejectedValue(new Error('connection refused')),
    get: jest.fn().mockRejectedValue(new Error('connection refused'))
})

const memory = () => {
    const store = new MemoryStore()
    store.init(options)

    return store
}

const resilient = (createPrimary: () => Store | null, fallback: Store = memory()) => {
    const store = new ResilientStore(createPrimary, fallback)
    store.init(options)

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
            const store = resilient(() => primary, fallback)

            await store.increment('ip')
            await store.increment('ip')

            expect((await primary.get('ip'))?.totalHits).toBe(2)
            expect(await fallback.get('ip')).toBeUndefined()
        })

        it('counts in memory and does not throw when the primary store fails', async () => {
            const store = resilient(() => brokenStore())

            await store.increment('ip')
            await store.increment('ip')
            const third = await store.increment('ip')

            expect(third.totalHits).toBe(3)
        })

        it('logs the outage once, not on every request', async () => {
            const store = resilient(() => brokenStore())

            await store.increment('a')
            await store.increment('b')
            await store.decrement('a')
            await store.resetKey('b')

            expect(logger.warn).toHaveBeenCalledTimes(1)
        })

        it('counts in memory while Redis is not ready and builds the Redis store only when it is', async () => {
            const primary = memory()
            let ready = false
            const createPrimary = jest.fn(() => (ready ? primary : null))
            const store = resilient(createPrimary)

            await store.increment('ip')
            expect(await primary.get('ip')).toBeUndefined()

            ready = true
            await store.increment('ip')

            expect((await primary.get('ip'))?.totalHits).toBe(1)
        })

        it('does not reject when the Redis store cannot load its script at start', async () => {
            const failingInit: Store = {
                ...brokenStore(),
                init: jest.fn().mockRejectedValue(new Error('NOSCRIPT uploading script failed'))
            }
            const store = resilient(() => failingInit)

            const hit = await store.increment('ip')

            expect(hit.totalHits).toBe(1)
            expect(failingInit.increment).not.toHaveBeenCalled()
        })
    })
})
