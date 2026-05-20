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

        it('should initialize empty body to object', () => {
            const req = createMockRequest({
                body: {}
            }) as Request

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body).toEqual({})
            expect(next).toHaveBeenCalled()
        })

        it('should handle undefined body gracefully', () => {
            const req = createMockRequest() as Request
            req.body = undefined

            const res = createMockResponse() as Response
            const next = createMockNext()

            sanitizeData(req, res, next)

            expect(req.body).toEqual({})
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

    describe('Quill HTML preservation', () => {
        const run = (content: string) => {
            const req = createMockRequest({ body: { content } }) as Request
            sanitizeData(req, createMockResponse() as Response, createMockNext())
            return req.body.content as string
        }

        it('preserves basic inline formatting', () => {
            const result = run('<p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s></p>')
            expect(result).toContain('<strong>bold</strong>')
            expect(result).toContain('<em>italic</em>')
            expect(result).toContain('<u>underline</u>')
            expect(result).toContain('<s>strike</s>')
        })

        it('preserves block elements', () => {
            const result = run('<blockquote>quote</blockquote><pre><code>code</code></pre>')
            expect(result).toContain('<blockquote>quote</blockquote>')
            expect(result).toContain('<pre><code>code</code></pre>')
        })

        it('preserves headings', () => {
            const input = '<h1>H1</h1><h2>H2</h2><h3>H3</h3>'
            const result = run(input)
            expect(result).toContain('<h1>H1</h1>')
            expect(result).toContain('<h2>H2</h2>')
            expect(result).toContain('<h3>H3</h3>')
        })

        it('preserves lists', () => {
            const result = run('<ul><li>item 1</li><li>item 2</li></ul><ol><li>one</li></ol>')
            expect(result).toContain('<ul>')
            expect(result).toContain('<li>item 1</li>')
            expect(result).toContain('<ol>')
        })

        it('preserves safe link attributes', () => {
            const result = run('<a href="https://example.com" target="_blank" rel="noopener">link</a>')
            expect(result).toContain('href="https://example.com"')
            expect(result).toContain('target="_blank"')
            expect(result).toContain('rel="noopener noreferrer"')
        })

        it('strips dangerous link attributes', () => {
            const result = run('<a href="javascript:evil()" onclick="evil()">link</a>')
            expect(result).not.toContain('javascript:')
            expect(result).not.toContain('onclick')
        })

        it('preserves img with safe attributes', () => {
            const result = run('<img src="https://example.com/img.png" alt="photo" width="100" height="100">')
            expect(result).toContain('src="https://example.com/img.png"')
            expect(result).toContain('alt="photo"')
        })

        it('strips img onerror', () => {
            const result = run('<img src="x" onerror="evil()">')
            expect(result).not.toContain('onerror')
        })

        it('strips data URI from img src', () => {
            const result = run('<img src="data:image/svg+xml,<svg onload=alert(1)>">')
            expect(result).not.toContain('data:')
        })

        it('preserves span with allowed color style', () => {
            const result = run('<span style="color: #ff0000;">red text</span>')
            expect(result).toContain('<span')
            expect(result).toContain('color')
            expect(result).toContain('red text')
        })

        it('strips span with disallowed style properties', () => {
            const result = run('<span style="position: absolute; top: 0;">text</span>')
            expect(result).not.toContain('position')
            expect(result).not.toContain('top')
            expect(result).toContain('text')
        })

        it('strips disallowed tags but keeps text content', () => {
            const result = run('<div>text inside div</div>')
            expect(result).not.toContain('<div>')
            expect(result).toContain('text inside div')
        })

        it('handles complex Quill output without stripping formatting', () => {
            const quillHtml = '<h2>Title</h2><p>Intro with <strong>bold</strong> and <em>italic</em>.</p><ul><li>Point one</li><li>Point two</li></ul><p><a href="https://example.com">Read more</a></p>'
            const result = run(quillHtml)
            expect(result).toContain('<h2>Title</h2>')
            expect(result).toContain('<strong>bold</strong>')
            expect(result).toContain('<em>italic</em>')
            expect(result).toContain('<li>Point one</li>')
            expect(result).toContain('href="https://example.com"')
        })
    })
})
