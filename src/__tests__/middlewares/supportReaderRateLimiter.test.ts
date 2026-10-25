import { EventEmitter } from 'events'
import type { Request, Response } from 'express'

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
    it('shares one bucket across IPs and forwards a 429 error after 30 reads, even after junk from the reader IP', async () => {
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

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatusCodes.TOO_MANY_REQUESTS
            })
        )
        expect(res.status).not.toHaveBeenCalled()
    })
})

const failAuth = async (ip: string) => {
    const res = createRateLimitMockResponse()
    const next = createMockNext()
    await supportReaderFailedAuthLimiter(
        createMockRequest({ ip }) as Request,
        res,
        next
    )
    ;(res as unknown as { statusCode: number }).statusCode =
        HttpStatusCodes.UNAUTHORIZED
    res.emit('finish')
    return { res, next }
}

describe('supportReaderFailedAuthLimiter (real implementation)', () => {
    it('lets 10 failed attempts through then forwards a 429 error', async () => {
        for (let attempt = 0; attempt < 10; attempt++) {
            const { next } = await failAuth('10.3.0.1')
            expect(next).toHaveBeenCalled()
        }

        const { res, next } = await failAuth('10.3.0.1')

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatusCodes.TOO_MANY_REQUESTS
            })
        )
        expect(res.status).not.toHaveBeenCalled()
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
})
