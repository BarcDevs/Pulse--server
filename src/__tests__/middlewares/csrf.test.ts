// @ts-nocheck
import Csrf from 'csrf'
import type { Response } from 'express'

import {
    csrfMiddleware,
    extractCsrfToken
} from '../../middlewares/csrf'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

const csrfProtection = new Csrf()

jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        auth: {
            unauthorized: jest.fn((msg) => new Error(msg ?? 'Unauthorized'))
        }
    }
}))

describe('extractCsrfToken', () => {
    it('sets req.csrfToken from header and calls next', () => {
        const req = {
            ...createMockRequest(),
            headers: { 'x-csrf-token': 'test-token' }
        } as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        extractCsrfToken(req, res, next)

        expect(req.csrfToken).toBe('test-token')
        expect(next).toHaveBeenCalled()
    })

    it('calls next even when header is missing', () => {
        const req = {
            ...createMockRequest(),
            headers: {}
        } as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        extractCsrfToken(req, res, next)

        expect(next).toHaveBeenCalled()
    })
})

describe('csrfMiddleware', () => {
    it('calls next for valid CSRF token', () => {
        const secret = csrfProtection.secretSync()
        const token = csrfProtection.create(secret)
        const req = createMockRequest({
            cookies: { _csrf: secret },
            csrfToken: token
        }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        csrfMiddleware(req, res, next)

        expect(next).toHaveBeenCalled()
    })

    it('throws for invalid CSRF token', () => {
        const req = createMockRequest({
            cookies: { _csrf: 'bad-secret' },
            csrfToken: 'bad-token'
        }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => csrfMiddleware(req, res, next)).toThrow()
    })

    it('throws when token is empty string', () => {
        const req = createMockRequest({
            cookies: { _csrf: 'some-secret' },
            csrfToken: ''
        }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => csrfMiddleware(req, res, next)).toThrow()
    })

    it('does not call next on invalid token', () => {
        const req = createMockRequest({
            cookies: { _csrf: 'invalid' },
            csrfToken: 'invalid'
        }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        try {
            csrfMiddleware(req, res, next)
        } catch {
            // expected
        }

        expect(next).not.toHaveBeenCalled()
    })
})
