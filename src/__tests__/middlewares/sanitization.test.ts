// @ts-nocheck
import type { Request, Response } from 'express'

import { sanitizeData } from '../../middlewares/sanitaization'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

describe('Sanitization Middleware', () => {
    describe('sanitizeData', () => {
        it(
            'should sanitize string with XSS script',
            () => {
                const req = createMockRequest({
                    body: {
                        content: '<script>alert("xss")</script>Hello'
                    }
                }) as Request

                const res = createMockResponse() as Response
                const next = createMockNext()

                sanitizeData(req, res, next)

                expect(req.body.content)
                    .not.toContain('<script>')
                expect(req.body.content).toContain('Hello')
                expect(next).toHaveBeenCalled()
            }
        )

        it('should sanitize nested objects', () => {
            const req = createMockRequest({
                body: {
                    user: {
                        name: '<img src=x onerror=alert(1)>John',
                        bio: '<script>evil()</script>Bio text'
                    }
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body.user.name)
                .not.toContain('onerror')
            expect(req.body.user.bio)
                .not.toContain('<script>')
            expect(next).toHaveBeenCalled()
        })

        it('should sanitize arrays', () => {
            const req = createMockRequest({
                body: {
                    tags: [
                        '<script>bad()</script>tag1',
                        'tag2',
                        '<img src=x onerror=evil()>tag3'
                    ]
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body.tags[0])
                .not.toContain('<script>')
            expect(req.body.tags[0]).toContain('tag1')
            expect(req.body.tags[2])
                .not.toContain('onerror')
            expect(next).toHaveBeenCalled()
        })

        it('should extract csrfToken from body', () => {
            const req = createMockRequest({
                body: {
                    csrfToken: 'test-csrf-token',
                    data: 'some data'
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.csrfToken).toBe('test-csrf-token')
            expect(next).toHaveBeenCalled()
        })

        it('should set body to null for empty body', () => {
            const req = createMockRequest({
                body: {}
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body).toBeNull()
            expect(next).toHaveBeenCalled()
        })

        it('should preserve clean strings', () => {
            const req = createMockRequest({
                body: {
                    title: 'Clean Title',
                    content: 'This is normal content without XSS'
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body.title).toBe('Clean Title')
            expect(req.body.content)
                .toBe('This is normal content without XSS')
            expect(next).toHaveBeenCalled()
        })

        it('should handle numbers and booleans', () => {
            const req = createMockRequest({
                body: {
                    count: 42,
                    active: true,
                    title: 'Test'
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body.count).toBe(42)
            expect(req.body.active).toBe(true)
            expect(next).toHaveBeenCalled()
        })

        it(
            'should remove dangerous HTML attributes',
            () => {
                const req = createMockRequest({
                    body: {
                        content: '<div onclick="evil()">Click me</div>'
                    }
                }) as Request

                const res = createMockResponse() as Response
                const next = createMockNext()

                sanitizeData(req, res, next)

                expect(req.body.content)
                    .not.toContain('onclick')
                expect(next).toHaveBeenCalled()
            }
        )

        it('should handle null values', () => {
            const req = createMockRequest({
                body: {
                    nullField: null,
                    title: 'Test'
                }
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body.nullField).toBeNull()
            expect(next).toHaveBeenCalled()
        })
    })
})
