// @ts-nocheck
import type { Request, Response } from 'express'

import { serverConfig } from '../../../config'
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
                    originalUrl: `/api/${serverConfig.apiVersion}/test`
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
                originalUrl: `/api/${serverConfig.apiVersion}/forum/posts/rate-limit-test-post/share`
            }) as Request

            const res = createMockResponse() as Response
            res.setHeader = jest.fn()
            const next = createMockNext()

            await sharePostRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })

    describe('sharePostRateLimiter behavior (real implementation)', () => {
        const { sharePostRateLimiter: realSharePostRateLimiter } =
            jest.requireActual('../../middlewares/rateLimiting')

        const createRateLimitMockResponse = () => {
            const headers: Record<string, unknown> = {}
            const res: Partial<MockResponse> & {
                getHeader: jest.Mock
                removeHeader: jest.Mock
                headersSent: boolean
            } = {
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
            }
            return res as unknown as Response
        }

        it('should allow the first share request for a post', async () => {
            const req = createMockRequest({
                ip: '10.0.0.1',
                params: { postId: 'limit-post-first' }
            }) as Request
            const res = createRateLimitMockResponse()
            const next = createMockNext()

            await realSharePostRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })

        it('should return 429 for a second share request on the same post from the same IP within an hour', async () => {
            const req = createMockRequest({
                ip: '10.0.0.2',
                params: { postId: 'limit-post-repeat' }
            }) as Request

            await realSharePostRateLimiter(req, createRateLimitMockResponse(), createMockNext())

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realSharePostRateLimiter(req, res, next)

            expect(next).not.toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(429)
        })

        it('should rate limit independently per post for the same IP', async () => {
            const ip = '10.0.0.3'

            await realSharePostRateLimiter(
                createMockRequest({ ip, params: { postId: 'limit-post-a' } }) as Request,
                createRateLimitMockResponse(),
                createMockNext()
            )

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realSharePostRateLimiter(
                createMockRequest({ ip, params: { postId: 'limit-post-b' } }) as Request,
                res,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })
    })
})
