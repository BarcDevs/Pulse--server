import type { Express } from 'express'

describe('CORS localhost allowance', () => {
    afterEach(() => {
        jest.resetModules()
    })

    const getCorsOriginHandler = (isDev: boolean) => {
        jest.doMock('../../../config', () => ({
            isDev,
            serverConfig: { origin: 'https://pulse.example.com' },
            loggingConfig: { dir: '/tmp/logs' }
        }))

        let originHandler:
            (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void =
            () => {}

        jest.doMock('../../lib/redis/rateLimitStore', () => ({
            createRateLimitStore: () => undefined
        }))

        jest.doMock('cors', () => (options: {
            origin: typeof originHandler
        }) => {
            originHandler = options.origin
            return (
                _req: unknown,
                _res: unknown,
                next: () => void
            ) => next()
        })

         
        const { declareMiddlewares } = require('../../middlewares')
        const mockApp = { use: jest.fn() } as unknown as Express
        declareMiddlewares(mockApp)

        return originHandler
    }

    it('allows localhost origins when isDev is true', () => {
        const originHandler = getCorsOriginHandler(true)
        const callback = jest.fn()

        originHandler('http://localhost:3000', callback)

        expect(callback).toHaveBeenCalledWith(null, true)
    })

    it('rejects localhost origins when isDev is false', () => {
        const originHandler = getCorsOriginHandler(false)
        const callback = jest.fn()

        originHandler('http://localhost:3000', callback)

        expect(callback).toHaveBeenCalledWith(expect.any(Error))
    })

    it('allows the configured server origin regardless of isDev', () => {
        const originHandler = getCorsOriginHandler(false)
        const callback = jest.fn()

        originHandler('https://pulse.example.com', callback)

        expect(callback).toHaveBeenCalledWith(null, true)
    })
})
