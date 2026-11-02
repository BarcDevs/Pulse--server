import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { authConfig } from '../../../config'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    isAuthenticated,
    isAuthenticatedOrGuest
} from '../../middlewares/isAuthenticated'
import { optionalAuthentication } from '../../middlewares/optionalAuthentication'
import { getSessionState } from '../../models/sessionModel'
import {
    createAuthToken,
    createMockNext,
    createMockRequest,
    createMockResponse,
    createMockUser
} from '../setup/testSetup'

// Mock error factory
jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        auth: {
            unauthorized: jest.fn(() => {
                const error = new Error(
                    'Unauthorized! please login first!'
                )
                ;(error as Error & {statusCode: number})
                    .statusCode = HttpStatusCodes.UNAUTHORIZED
                return error
            }),
            forbidden: jest.fn((message?: string) => {
                const error = new Error(`Forbidden! ${message}`)
                ;(error as Error & {statusCode: number})
                    .statusCode = HttpStatusCodes.FORBIDDEN
                return error
            })
        }
    }
}))

const mockSession = (
    session: { active: boolean, isGuest?: boolean, passwordUpdatedAt: Date } | null
) =>
    jest.mocked(getSessionState)
        .mockResolvedValue(
            session && { isGuest: false, ...session }
        )

const runWithToken = (accessToken?: string) => {
    const req = createMockRequest({
        cookies: accessToken === undefined
            ? {}
            : { accessToken }
    }) as Request
    const res = createMockResponse() as unknown as Response
    const next = createMockNext()

    return {
        req,
        res,
        next,
        run: () => isAuthenticated(req, res, next)
    }
}

const signToken = (
    secret: string,
    expiresIn: jwt.SignOptions['expiresIn']
) => {
    const mockUser = createMockUser()

    return jwt.sign(
        {
            id: mockUser.id,
            email: mockUser.email
        },
        secret,
        { expiresIn }
    )
}

describe('isAuthenticated Middleware', () => {
    beforeEach(() => {
        mockSession({
            active: true,
            passwordUpdatedAt: new Date(0)
        })
    })

    it(
        'should set req.userId for valid token',
        async () => {
            const mockUser = createMockUser()
            const { req, res, next, run } =
                runWithToken(createAuthToken(mockUser))

            await run()

            expect(req.userId).toBe(mockUser.id)
            expect(next).toHaveBeenCalled()
            expect(res.clearCookie)
                .not.toHaveBeenCalled()
        }
    )

    it.each([
        ['missing', undefined],
        ['empty', ''],
        ['invalid', 'invalid-token'],
        ['malformed', 'not.a.valid.jwt.token'],
        ['expired', signToken(authConfig.jwtSecret!, '-1h')],
        ['wrong-secret', signToken('wrong-secret', '1h')]
    ])(
        'should reject %s token and clear the cookie',
        async (_label, token) => {
            const { res, next, run } = runWithToken(token)

            await expect(run()).rejects.toThrow()
            expect(next).not.toHaveBeenCalled()
            expect(res.clearCookie)
                .toHaveBeenCalledWith('accessToken')
        }
    )

    it('should reject a token of a deactivated user', async () => {
        mockSession({
            active: false,
            passwordUpdatedAt: new Date(0)
        })
        const { res, run } =
            runWithToken(createAuthToken(createMockUser()))

        await expect(run()).rejects.toThrow()
        expect(res.clearCookie)
            .toHaveBeenCalledWith('accessToken')
    })

    it('should reject a token of a deleted user', async () => {
        mockSession(null)
        const { run } =
            runWithToken(createAuthToken(createMockUser()))

        await expect(run()).rejects.toThrow()
    })

    it(
        'should reject a token issued before the last password change',
        async () => {
            const token = createAuthToken(createMockUser())
            mockSession({
                active: true,
                passwordUpdatedAt: new Date(Date.now() + 5000)
            })
            const { run } = runWithToken(token)

            await expect(run()).rejects.toThrow()
        }
    )

    it(
        'should accept a token issued in the same second as the password change',
        async () => {
            mockSession({
                active: true,
                passwordUpdatedAt: new Date()
            })
            const { next, run } =
                runWithToken(createAuthToken(createMockUser()))

            await run()

            expect(next).toHaveBeenCalled()
        }
    )

    it(
        'should propagate DB errors without clearing the cookie',
        async () => {
            jest.mocked(getSessionState)
                .mockRejectedValue(new Error('db down'))
            const { res, run } =
                runWithToken(createAuthToken(createMockUser()))

            await expect(run()).rejects.toThrow('db down')
            expect(res.clearCookie).not.toHaveBeenCalled()
        }
    )
})

describe('optionalAuthentication Middleware', () => {
    const runOptional = async (accessToken?: string) => {
        const req = createMockRequest({
            cookies: accessToken === undefined
                ? {}
                : { accessToken }
        }) as Request
        const next = createMockNext()

        await optionalAuthentication(
            req,
            createMockResponse() as unknown as Response,
            next
        )

        expect(next).toHaveBeenCalled()

        return req.userId
    }

    it('should set req.userId for a live session', async () => {
        mockSession({
            active: true,
            passwordUpdatedAt: new Date(0)
        })
        const mockUser = createMockUser()

        expect(await runOptional(createAuthToken(mockUser)))
            .toBe(mockUser.id)
    })

    it('should leave req.userId unset for a revoked session', async () => {
        mockSession({
            active: false,
            passwordUpdatedAt: new Date(0)
        })

        expect(await runOptional(createAuthToken(createMockUser())))
            .toBeUndefined()
    })

    it('should leave req.userId unset without a token', async () => {
        expect(await runOptional()).toBeUndefined()
    })
})

describe('guest sessions', () => {
    const guestToken = () => createAuthToken(createMockUser())
    const mockRes = () => createMockResponse() as unknown as Response

    beforeEach(() => {
        mockSession({
            active: true,
            isGuest: true,
            passwordUpdatedAt: new Date(0)
        })
    })

    it('isAuthenticated rejects a guest with 403 and keeps the cookie', async () => {
        const { req, res, next, run } = runWithToken(guestToken())

        await expect(run()).rejects.toThrow('Create an account to use this feature')
        expect(next).not.toHaveBeenCalled()
        expect(req.userId).toBeUndefined()
        expect(res.clearCookie).not.toHaveBeenCalled()
    })

    it('isAuthenticatedOrGuest lets a guest through and flags the request', async () => {
        const req = createMockRequest({
            cookies: { accessToken: guestToken() }
        }) as Request
        const next = createMockNext()

        await isAuthenticatedOrGuest(req, mockRes(), next)

        expect(next).toHaveBeenCalled()
        expect(req.userId).toBe(createMockUser().id)
        expect(req.isGuest).toBe(true)
    })

    it('isAuthenticatedOrGuest flags a real user as not a guest', async () => {
        mockSession({
            active: true,
            passwordUpdatedAt: new Date(0)
        })
        const req = createMockRequest({
            cookies: { accessToken: guestToken() }
        }) as Request

        await isAuthenticatedOrGuest(req, mockRes(), createMockNext())

        expect(req.isGuest).toBe(false)
    })

    it('isAuthenticatedOrGuest still rejects a missing token', async () => {
        const req = createMockRequest({ cookies: {} }) as Request

        await expect(
            isAuthenticatedOrGuest(req, mockRes(), createMockNext())
        ).rejects.toThrow()
    })

    it('optionalAuthentication treats a guest as anonymous', async () => {
        const req = createMockRequest({
            cookies: { accessToken: guestToken() }
        }) as Request

        await optionalAuthentication(req, mockRes(), createMockNext())

        expect(req.userId).toBeUndefined()
    })
})
