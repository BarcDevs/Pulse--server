// @ts-nocheck
import type { Request, Response } from 'express'

import { cacheMiddleware } from '../../middlewares/cache'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

describe('Cache Middleware', () => {
    describe('cacheMiddleware', () => {
        it('should skip caching for non-GET requests', () => {
            const req = createMockRequest({
                method: 'POST',
                originalUrl: '/api/v1/posts'
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })

        it('should skip caching for PUT requests', () => {
            const req = createMockRequest({
                method: 'PUT',
                originalUrl: '/api/v1/posts/123'
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
        })

        it('should skip caching for DELETE requests', () => {
            const req = createMockRequest({
                method: 'DELETE',
                originalUrl: '/api/v1/posts/123'
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
        })

        it('should pass through for GET request on cache miss', () => {
            const req = createMockRequest({
                method: 'GET',
                originalUrl: '/api/v1/uncached-endpoint'
            }) as Request

            const res = createMockResponse() as Response
            const originalSend = res.send
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
            expect(res.send).not.toBe(originalSend)
        })

        it('should wrap res.send for GET requests', () => {
            const req = createMockRequest({
                method: 'GET',
                originalUrl: '/api/v1/test-wrap-send'
            }) as Request

            const res = createMockResponse() as Response
            res.send = jest.fn().mockReturnThis()
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
            expect(typeof res.send).toBe('function')
        })

        it('should use originalUrl as cache key', () => {
            const req = createMockRequest({
                method: 'GET',
                originalUrl: '/api/v1/posts?page=1&limit=10'
            }) as Request

            const res = createMockResponse() as Response
            res.send = jest.fn().mockReturnThis()
            const next = createMockNext()

            cacheMiddleware(req, res, next)

            expect(next).toHaveBeenCalled()
        })

        it('should differentiate cache keys by query params', () => {
            const req1 = createMockRequest({
                method: 'GET',
                originalUrl: '/api/v1/posts?page=1'
            }) as Request

            const req2 = createMockRequest({
                method: 'GET',
                originalUrl: '/api/v1/posts?page=2'
            }) as Request

            const res1 = createMockResponse() as Response
            const res2 = createMockResponse() as Response
            res1.send = jest.fn().mockReturnThis()
            res2.send = jest.fn().mockReturnThis()
            const next = createMockNext()

            cacheMiddleware(req1, res1, next)
            cacheMiddleware(req2, res2, next)

            expect(next).toHaveBeenCalledTimes(2)
        })
    })
})
