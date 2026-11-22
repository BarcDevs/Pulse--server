import {
    buildRedisOptions,
    closeRedisClient,
    getRedisClient,
    isRedisEnabled
} from '../../../lib/redis/redisClient'

const mockRedisConfig = {
    host: '',
    port: 6379,
    password: '',
    connectTimeoutMs: 1000,
    commandTimeoutMs: 300,
    keyPrefix: 'pulse:'
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

describe('redisClient', () => {
    afterEach(async () => {
        mockRedisConfig.host = ''
        mockRedisConfig.password = ''
        await closeRedisClient()
    })

    it('is off and returns no client while the host is empty', () => {
        expect(isRedisEnabled()).toBe(false)
        expect(getRedisClient()).toBeNull()
    })

    it('never queues commands while offline and tries each command once', () => {
        mockRedisConfig.host = 'redis'
        mockRedisConfig.password = 'secret'

        const options = buildRedisOptions()

        expect(options).toMatchObject({
            host: 'redis',
            port: 6379,
            password: 'secret',
            keyPrefix: 'pulse:',
            connectTimeout: 1000,
            commandTimeout: 300,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false
        })
    })

    it('leaves the password out when none is configured', () => {
        mockRedisConfig.host = 'redis'

        expect(buildRedisOptions().password).toBeUndefined()
    })

    it('reuses one client for every caller', () => {
        mockRedisConfig.host = '127.0.0.1'

        const first = getRedisClient()
        const second = getRedisClient()

        expect(first).not.toBeNull()
        expect(second).toBe(first)
    })
})
