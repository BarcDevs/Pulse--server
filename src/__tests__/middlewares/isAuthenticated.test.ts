// @ts-nocheck
import type {Request, Response} from 'express'
import jwt from 'jsonwebtoken'

import {authConfig} from '../../../config'
import {isAuthenticated} from '../../middlewares/isAuthenticated'
import {
    createAuthToken,
    createMockNext,
    createMockRequest,
    createMockResponse,
    createMockUser
} from '../setup/testSetup'

// Mock error factory
jest.mock('../../errors/factory', () => ({
    errorFactory: {
        auth: {
            unauthorized: jest.fn(() => {
                const error = new Error('Unauthorized! please login first!')
                ;(error as Error & { statusCode: number }).statusCode = 401
                return error
            })
        }
    }
}))

describe('isAuthenticated Middleware', () => {
    it('should set req.userId for valid token', () => {
        const mockUser = createMockUser()
        const token = createAuthToken(mockUser)
        const req = createMockRequest({ cookies: { accessToken: token } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        isAuthenticated(req, res, next)

        expect(req.userId).toBe(mockUser.id)
        expect(next).toHaveBeenCalled()
        expect(res.clearCookie).not.toHaveBeenCalled()
    })

    it('should throw error for missing token', () => {
        const req = createMockRequest({ cookies: {} }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should throw error for empty token', () => {
        const req = createMockRequest({ cookies: { accessToken: '' } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should throw error for invalid token', () => {
        const req = createMockRequest({ cookies: { accessToken: 'invalid-token' } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should throw error for expired token', () => {
        const mockUser = createMockUser()
        const expiredToken = jwt.sign(
            { id: mockUser.id, email: mockUser.email },
            authConfig.jwtSecret!,
            { expiresIn: '-1h' }
        )
        const req = createMockRequest({ cookies: { accessToken: expiredToken } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should throw error for token with wrong secret', () => {
        const mockUser = createMockUser()
        const wrongSecretToken = jwt.sign(
            { id: mockUser.id, email: mockUser.email },
            'wrong-secret',
            { expiresIn: '1h' }
        )
        const req = createMockRequest({ cookies: { accessToken: wrongSecretToken } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should throw error for malformed token', () => {
        const req = createMockRequest({ cookies: { accessToken: 'not.a.valid.jwt.token' } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        expect(() => isAuthenticated(req, res, next)).toThrow()
        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })

    it('should clear cookie on any error', () => {
        const req = createMockRequest({ cookies: { accessToken: 'bad-token' } }) as Request
        const res = createMockResponse() as Response
        const next = createMockNext()

        try {
            isAuthenticated(req, res, next)
        } catch {
            // Expected to throw
        }

        expect(res.clearCookie).toHaveBeenCalledWith('accessToken')
    })
})
