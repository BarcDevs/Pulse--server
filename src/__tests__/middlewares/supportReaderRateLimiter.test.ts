import { EventEmitter } from 'events'
import type { Request, Response } from 'express'

import { supportReaderConfig } from '../../../config'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    createMockNext,
    createMockRequest
} from '../setup/testSetup'

const {
    supportReaderFailedAuthLimiter,
    supportReaderRateLimiter
} =
    jest.requireActual('../../middlewares/rateLimiting')

const createRateLimitMockResponse = () => {
    const headers: Record<string, unknown> = {}
    return Object.assign(new EventEmitter(), {
        statusCode: HttpStatusCodes.OK,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn((key: string, value: unknown) => {
            headers[key] = value
        }),
        getHeader: jest.fn((key: string) => headers[key]),
        removeHeader: jest.fn((key: string) => {
            delete headers[key]
        }),
        headersSent: false
    }) as unknown as Response
}

describe('supportReaderRateLimiter (real implementation)', () => {
    it('shares one bucket across IPs and returns 429 in the standard error shape after 30 reads, even after junk from the reader IP', async () => {
        for (let attempt = 0; attempt < 40; attempt++)
            await failAuth('10.2.1.0')

        for (let attempt = 0; attempt < 30; attempt++) {
            const next = createMockNext()
            await supportReaderRateLimiter(
                createMockRequest({
                    ip: `10.2.1.${attempt}`
                }) as Request,
                createRateLimitMockResponse(),
                next
            )
            expect(next).toHaveBeenCalled()
        }

        const res = createRateLimitMockResponse()
        const next = createMockNext()
        await supportReaderRateLimiter(
            createMockRequest({ ip: '10.2.1.200' }) as Request,
            res,
            next
        )

        expect(next).not.toHaveBeenCalled()
        expect(res.status)
            .toHaveBeenCalledWith(HttpStatusCodes.TOO_MANY_REQUESTS)
        expect(res.json).toHaveBeenCalledWith({
            message: expect.any(String),
            error: [
                {
                    statusType: 'Too Many Requests',
                    statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                    error: expect.any(String)
                }
            ]
        })
    })
})

const readerSecret = 'reader-secret-0123456789'

const callFailedAuthLimiter = async (
    ip: string,
    statusCode: number,
    authorization?: string
) => {
    const res = createRateLimitMockResponse()
    const next = createMockNext()
    await supportReaderFailedAuthLimiter(
        Object.assign(createMockRequest({ ip }), {
            headers: { authorization }
        }) as Request,
        res,
        next
    )
    ;(res as unknown as { statusCode: number }).statusCode = statusCode
    res.emit('finish')
    return { res, next }
}

const failAuth = (ip: string) =>
    callFailedAuthLimiter(ip, HttpStatusCodes.UNAUTHORIZED)

describe('supportReaderFailedAuthLimiter (real implementation)', () => {
    it('lets 10 failed attempts through then returns 429 in the standard error shape', async () => {
        for (let attempt = 0; attempt < 10; attempt++) {
            const { next } = await failAuth('10.3.0.1')
            expect(next).toHaveBeenCalled()
        }

        const { res, next } = await failAuth('10.3.0.1')

        expect(next).not.toHaveBeenCalled()
        expect(res.status)
            .toHaveBeenCalledWith(HttpStatusCodes.TOO_MANY_REQUESTS)
        expect(res.json).toHaveBeenCalledWith({
            message: expect.any(String),
            error: [
                {
                    statusType: 'Too Many Requests',
                    statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                    error: expect.any(String)
                }
            ]
        })
    })

    it('does not count successful requests', async () => {
        for (let attempt = 0; attempt < 15; attempt++) {
            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await supportReaderFailedAuthLimiter(
                createMockRequest({ ip: '10.3.0.2' }) as Request,
                res,
                next
            )
            expect(next).toHaveBeenCalled()
            res.emit('finish')
        }
    })

    it('counts failures per IP', async () => {
        for (let attempt = 0; attempt < 10; attempt++)
            await failAuth('10.3.0.3')

        const { next } = await failAuth('10.3.0.4')

        expect(next).toHaveBeenCalled()
    })

    describe('with the reader secret configured', () => {
        const originalSecret = supportReaderConfig.secret

        beforeEach(() => {
            supportReaderConfig.secret = readerSecret
        })

        afterEach(() => {
            supportReaderConfig.secret = originalSecret
        })

        it('never blocks a valid secret, even after junk from the same IP', async () => {
            for (let attempt = 0; attempt < 11; attempt++)
                await failAuth('10.3.0.5')

            const { next } = await callFailedAuthLimiter(
                '10.3.0.5',
                HttpStatusCodes.OK,
                `Bearer ${readerSecret}`
            )

            expect(next).toHaveBeenCalled()
        })

        it('does not count 400 and 500 responses from a valid reader', async () => {
            for (let attempt = 0; attempt < 12; attempt++) {
                await callFailedAuthLimiter(
                    '10.3.0.6',
                    attempt % 2
                        ? HttpStatusCodes.BAD_REQUEST
                        : HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    `Bearer ${readerSecret}`
                )
            }

            const { next } = await failAuth('10.3.0.6')

            expect(next).toHaveBeenCalled()
        })
    })
})
