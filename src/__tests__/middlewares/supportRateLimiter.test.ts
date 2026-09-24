import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    createMockNext,
    createMockRequest
} from '../setup/testSetup'

const { supportRateLimiter } =
    jest.requireActual('../../middlewares/rateLimiting')

const createRateLimitMockResponse = () => {
    const headers: Record<string, unknown> = {}
    return {
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
    } as unknown as Response
}

describe('supportRateLimiter (real implementation)', () => {
    it('allows 5 requests then returns 429 in the standard error shape', async () => {
        const req = createMockRequest({
            ip: '10.1.0.1'
        }) as Request

        for (let attempt = 0; attempt < 5; attempt++) {
            const next = createMockNext()
            await supportRateLimiter(
                req,
                createRateLimitMockResponse(),
                next
            )
            expect(next).toHaveBeenCalled()
        }

        const res = createRateLimitMockResponse()
        const next = createMockNext()
        await supportRateLimiter(req, res, next)

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

    it('limits each IP independently', async () => {
        const res = createRateLimitMockResponse()
        const next = createMockNext()

        await supportRateLimiter(
            createMockRequest({ ip: '10.1.0.2' }) as Request,
            res,
            next
        )

        expect(next).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
    })
})
