import { cacheAside, invalidateCache } from '../../../lib/redis/cache'
import { createFakeRedis } from '../../setup/fakeRedis'

const mockRedis = createFakeRedis()
let mockClient: ReturnType<typeof createFakeRedis> | null = mockRedis

jest.mock('../../../lib/redis/redisClient', () => ({
    getRedisClient: () => mockClient
}))
jest.mock('../../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

describe('cacheAside', () => {
    beforeEach(() => {
        mockClient = mockRedis
        mockRedis.status = 'ready'
        mockRedis.clear()
        jest.clearAllMocks()
    })

    it('loads on a miss and stores the value with an expiry', async () => {
        const load = jest.fn().mockResolvedValue({ id: 'a' })

        const value = await cacheAside('k', 30, load)

        expect(value).toEqual({ id: 'a' })
        expect(mockRedis.set).toHaveBeenCalledWith('k', '{"id":"a"}', 'EX', 30)
        expect(mockRedis.ttlOf('k')).toBeGreaterThan(0)
    })

    it('answers a hit from Redis without loading', async () => {
        const load = jest.fn().mockResolvedValue({ id: 'a' })

        await cacheAside('k', 30, load)
        const second = await cacheAside('k', 30, load)

        expect(second).toEqual({ id: 'a' })
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('loads again once the expiry has passed', async () => {
        const load = jest.fn().mockResolvedValue({ id: 'a' })
        const now = Date.now()
        const clock = jest.spyOn(Date, 'now').mockReturnValue(now)

        await cacheAside('k', 30, load)
        clock.mockReturnValue(now + 31_000)
        await cacheAside('k', 30, load)
        clock.mockRestore()

        expect(load).toHaveBeenCalledTimes(2)
    })

    it('does not store a missing value', async () => {
        const load = jest.fn().mockResolvedValue(null)

        await cacheAside('k', 30, load)
        await cacheAside('k', 30, load)

        expect(load).toHaveBeenCalledTimes(2)
        expect(mockRedis.set).not.toHaveBeenCalled()
    })

    it('reads again after the key is invalidated', async () => {
        const load = jest.fn().mockResolvedValue({ id: 'a' })

        await cacheAside('k', 30, load)
        await invalidateCache('k')
        await cacheAside('k', 30, load)

        expect(load).toHaveBeenCalledTimes(2)
    })

    it('refuses a key without a positive whole-number expiry', async () => {
        await expect(cacheAside('k', 0, jest.fn())).rejects.toThrow('expiry')
        await expect(cacheAside('k', 1.5, jest.fn())).rejects.toThrow('expiry')
    })

    describe('when Redis is not available', () => {
        it('reads from the loader when Redis is off', async () => {
            mockClient = null
            const load = jest.fn().mockResolvedValue({ id: 'a' })

            const value = await cacheAside('k', 30, load)

            expect(value).toEqual({ id: 'a' })
        })

        it('reads from the loader when Redis is not connected', async () => {
            mockRedis.status = 'reconnecting'
            const load = jest.fn().mockResolvedValue({ id: 'a' })

            await cacheAside('k', 30, load)

            expect(mockRedis.get).not.toHaveBeenCalled()
            expect(load).toHaveBeenCalledTimes(1)
        })

        it('reads from the loader when a Redis command fails, without throwing', async () => {
            mockRedis.get.mockRejectedValueOnce(new Error('Command timed out'))
            const load = jest.fn().mockResolvedValue({ id: 'a' })

            const value = await cacheAside('k', 30, load)

            expect(value).toEqual({ id: 'a' })
        })

        it('still answers when storing the value fails', async () => {
            mockRedis.set.mockRejectedValueOnce(new Error('Command timed out'))
            const load = jest.fn().mockResolvedValue({ id: 'a' })

            const value = await cacheAside('k', 30, load)
            await Promise.resolve()

            expect(value).toEqual({ id: 'a' })
        })

        it('does not throw when invalidating fails', async () => {
            mockRedis.del.mockRejectedValueOnce(new Error('Command timed out'))

            await expect(invalidateCache('k')).resolves.toBeUndefined()
        })
    })
})
