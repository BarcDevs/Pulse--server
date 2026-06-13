// @ts-nocheck
import type { Request, Response } from 'express'

import {
    rateLimiter,
    sharePostRateLimiter
} from '../../middlewares/rateLimiting'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

describe('Rate Limiting Middleware', () => {
    describe('rateLimiter configuration', () => {
        it('should be defined', () => {
            expect(rateLimiter).toBeDefined()
        })

        it('should be a function (middleware)', () => {
            expect(typeof rateLimiter).toBe('function')
        })

        it('should have middleware signature', () => {
            expect(rateLimiter.length)
                .toBeGreaterThanOrEqual(2)
        })
    })

    describe('rateLimiter behavior', () => {
        it(
            'should call next for normal requests',
            async () => {
                const req = createMockRequest({
                    ip: '127.0.0.1',
                    method: 'GET',
                    originalUrl: '/api/v1/test'
                }) as Request

                const res = createMockResponse() as Response
                res.setHeader = jest.fn()
                const next = createMockNext()

                await rateLimiter(req, res, next)

                expect(next).toHaveBeenCalled()
            }
        )
    })

    describe('sharePostRateLimiter', () => {
        it('should be defined', () => {
            expect(sharePostRateLimiter).toBeDefined()
        })

        it('should be a function (middleware)', () => {
            expect(typeof sharePostRateLimiter).toBe('function')
        })

        it('should call next for the first share request on a post', async () => {
            const req = createMockRequest({
                ip: '127.0.0.1',
                params: { postId: 'rate-limit-test-post' },
                method: 'POST',
                originalUrl: '/api/v1/forum/posts/rate-limit-test-post/share'
            }) as Request

            const res = createMockResponse() as Response
            res.setHeader = jest.fn()
            const next = createMockNext()

            await sharePostRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })
})
