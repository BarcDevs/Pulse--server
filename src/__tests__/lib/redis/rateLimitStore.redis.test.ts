// Runs only against a real Redis: REDIS_TEST_HOST (and REDIS_TEST_PORT,
// REDIS_TEST_PASSWORD) point at one, for example
//   docker run -d -p 6390:6379 redis:7.4-alpine redis-server --requirepass x
// CI has no Redis, so these tests are skipped there.
import { createRateLimitStore } from '../../../lib/redis/rateLimitStore'
import { closeRedisClient, getRedisClient } from '../../../lib/redis/redisClient'

const host = process.env.REDIS_TEST_HOST ?? ''

const mockRedisConfig = {
    host,
    port: Number(process.env.REDIS_TEST_PORT ?? 6379),
    password: process.env.REDIS_TEST_PASSWORD ?? '',
    connectTimeoutMs: 1000,
    commandTimeoutMs: 1000,
    keyPrefix: 'pulse-test:'
}

jest.mock('../../../../config', () => ({
    get redisConfig() {
        return mockRedisConfig
    }
}))
jest.mock('../../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

const describeWithRedis = host ? describe : describe.skip

const waitUntilReady = async () => {
    const client = getRedisClient()
    if (client?.status !== 'ready') {
        await new Promise<void>(resolve => client?.once('ready', () => resolve()))
    }
}

describeWithRedis('rate limit store against a real Redis', () => {
    const key = `ip-${Date.now()}`

    afterAll(async () => {
        await closeRedisClient()
    })

    it('keeps a counter across a server restart', async () => {
        await waitUntilReady()
        const before = createRateLimitStore('restart-test')
        before?.init?.({ windowMs: 60_000 } as never)
        await before?.increment(key)
        await before?.increment(key)

        // The restart: the client and the store are gone, a new process builds them again
        await closeRedisClient()
        await waitUntilReady()
        const after = createRateLimitStore('restart-test')
        after?.init?.({ windowMs: 60_000 } as never)
        const third = await after?.increment(key)

        expect(third?.totalHits).toBe(3)
    })

    it('keeps the counters of two limiters apart', async () => {
        await waitUntilReady()
        const login = createRateLimitStore('login-test')
        const signup = createRateLimitStore('signup-test')
        login?.init?.({ windowMs: 60_000 } as never)
        signup?.init?.({ windowMs: 60_000 } as never)

        await login?.increment(key)
        const other = await signup?.increment(key)

        expect(other?.totalHits).toBe(1)
    })
})
