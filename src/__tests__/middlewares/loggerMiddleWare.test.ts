// @ts-nocheck
import { loggerMiddleware } from '../../middlewares/loggerMiddleWare'
import logger from '../../utils/logger'
import {
    createMockNext,
    createMockRequest
} from '../setup/testSetup'

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        http: jest.fn()
    }
}))

const makeRes = () => ({
    on: jest.fn(),
    statusCode: 200
})

describe('loggerMiddleware', () => {
    it('calls next', () => {
        const req = { ...createMockRequest(), method: 'GET', path: '/test' } as any
        const res = makeRes() as any
        const next = createMockNext()

        loggerMiddleware(req, res, next)

        expect(next).toHaveBeenCalled()
    })

    it('registers finish event listener on response', () => {
        const req = { ...createMockRequest(), method: 'GET', path: '/test' } as any
        const res = makeRes() as any
        const next = createMockNext()

        loggerMiddleware(req, res, next)

        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
    })

    it('logs request details on finish', () => {
        const req = {
            method: 'POST',
            path: '/api/check-in',
            userId: 'user-123'
        } as any
        let finishHandler: () => void
        const res = {
            on: jest.fn((event: string, cb: () => void) => {
                if (event === 'finish') finishHandler = cb
            }),
            statusCode: 201
        } as any
        const next = createMockNext()

        loggerMiddleware(req, res, next)
        finishHandler()

        expect(logger.http).toHaveBeenCalledWith(
            expect.stringContaining('POST')
        )
    })

    it('uses dash for userId when not set', () => {
        const req = { method: 'GET', path: '/api/test' } as any
        let finishHandler: () => void
        const res = {
            on: jest.fn((event: string, cb: () => void) => {
                if (event === 'finish') finishHandler = cb
            }),
            statusCode: 200
        } as any
        const next = createMockNext()

        loggerMiddleware(req, res, next)
        finishHandler()

        expect(logger.http).toHaveBeenCalledWith(
            expect.stringContaining('userId=-')
        )
    })
})
