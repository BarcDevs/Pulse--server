import type { Request } from 'express'

import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { createRateLimitMockResponse } from '../setup/rateLimitMockResponse'
import {
    createMockNext,
    createMockRequest
} from '../setup/testSetup'

const { supportRateLimiter } =
    jest.requireActual('../../middlewares/rateLimiting')

describe('supportRateLimiter (real implementation)', () => {
    it('allows 5 requests then forwards a 429 error to the error handler', async () => {
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

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatusCodes.TOO_MANY_REQUESTS
            })
        )
        expect(res.status).not.toHaveBeenCalled()
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
