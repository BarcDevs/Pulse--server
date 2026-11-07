import { authConfig } from '../../../config'
import { requireGuestHeader } from '../../middlewares/requireGuestHeader'
import logger from '../../utils/logger'
import {
    createMockNext,
    createMockRequest
} from '../setup/testSetup'

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        warn: jest.fn()
    }
}))

const makeReq = (headers: Record<string, string> = {}) =>
    ({
        ...createMockRequest(),
        headers
    }) as any

describe('requireGuestHeader', () => {
    const original = authConfig.requireGuestHeader

    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterAll(() => {
        authConfig.requireGuestHeader = original
    })

    describe('flag on', () => {
        beforeEach(() => {
            authConfig.requireGuestHeader = true
        })

        it('throws 403 when the header is missing', () => {
            const next = createMockNext()

            expect(() => requireGuestHeader(makeReq(), {} as any, next))
                .toThrow(expect.objectContaining({ statusCode: 403 }))
            expect(next).not.toHaveBeenCalled()
        })

        it('throws 403 when the header is empty', () => {
            const next = createMockNext()

            expect(() => requireGuestHeader(
                makeReq({ 'x-requested-with': '' }),
                {} as any,
                next
            )).toThrow(expect.objectContaining({ statusCode: 403 }))
            expect(next).not.toHaveBeenCalled()
        })

        it('calls next when the header is present', () => {
            const next = createMockNext()

            requireGuestHeader(
                makeReq({ 'x-requested-with': 'XMLHttpRequest' }),
                {} as any,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(logger.warn).not.toHaveBeenCalled()
        })
    })

    describe('flag off', () => {
        beforeEach(() => {
            authConfig.requireGuestHeader = false
        })

        it('logs a warning and calls next when the header is missing', () => {
            const next = createMockNext()

            requireGuestHeader(makeReq(), {} as any, next)

            expect(next).toHaveBeenCalled()
            expect(logger.warn).toHaveBeenCalledTimes(1)
        })

        it('does not log the IP or the cookies', () => {
            const req = makeReq({ cookie: 'accessToken=secret-value' })
            req.ip = '203.0.113.9'

            requireGuestHeader(req, {} as any, createMockNext())

            expect(JSON.stringify(jest.mocked(logger.warn).mock.calls))
                .not.toMatch(/203\.0\.113\.9|secret-value/)
        })

        it('stays quiet when the header is present', () => {
            const next = createMockNext()

            requireGuestHeader(
                makeReq({ 'x-requested-with': 'fetch' }),
                {} as any,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(logger.warn).not.toHaveBeenCalled()
        })
    })
})
