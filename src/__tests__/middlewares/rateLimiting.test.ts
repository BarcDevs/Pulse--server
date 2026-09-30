import type { Request, Response } from 'express'

import { serverConfig } from '../../../config'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    checkInMutationRateLimiter,
    loginRateLimiter,
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

                const res = createMockResponse() as unknown as Response
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

            const res = createMockResponse() as unknown as Response
            res.setHeader = jest.fn()
            const next = createMockNext()

            await sharePostRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })

    describe('checkInMutationRateLimiter', () => {
        it('should be defined', () => {
            expect(checkInMutationRateLimiter).toBeDefined()
        })

        it('should be a function (middleware)', () => {
            expect(typeof checkInMutationRateLimiter).toBe('function')
        })

        it('should call next for the first check-in mutation', async () => {
            const req = createMockRequest({
                ip: '127.0.0.1',
                userId: 'check-in-rate-limit-user',
                method: 'POST',
                originalUrl: `/api/${serverConfig.apiVersion}/check-in`
            }) as Request

            const res = createMockResponse() as unknown as Response
            res.setHeader = jest.fn()
            const next = createMockNext()

            await checkInMutationRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })

    describe('checkInMutationRateLimiter behavior (real implementation)', () => {
        const { checkInMutationRateLimiter: realCheckInMutationRateLimiter } =
            jest.requireActual('../../middlewares/rateLimiting')

        const createRateLimitMockResponse = () => {
            const headers: Record<string, unknown> = {}
            const res = {
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
            return res as unknown as unknown as Response
        }

        it('should rate limit independently per user for the same IP', async () => {
            const ip = '10.0.0.5'

            await realCheckInMutationRateLimiter(
                createMockRequest({ ip, userId: 'check-in-user-a' }) as Request,
                createRateLimitMockResponse(),
                createMockNext()
            )

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realCheckInMutationRateLimiter(
                createMockRequest({ ip, userId: 'check-in-user-b' }) as Request,
                res,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })
    })

    describe('loginRateLimiter', () => {
        it('should be defined', () => {
            expect(loginRateLimiter).toBeDefined()
        })

        it('should be a function (middleware)', () => {
            expect(typeof loginRateLimiter).toBe('function')
        })

        it('should call next for the first login attempt', async () => {
            const req = createMockRequest({
                ip: '127.0.0.1',
                body: { email: 'login-rate-limit-test@test.com' },
                method: 'POST',
                originalUrl: `/api/${serverConfig.apiVersion}/auth/login`
            }) as Request

            const res = createMockResponse() as unknown as Response
            res.setHeader = jest.fn()
            const next = createMockNext()

            await loginRateLimiter(req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })

    describe('loginRateLimiter behavior (real implementation)', () => {
        const { loginRateLimiter: realLoginRateLimiter } =
            jest.requireActual('../../middlewares/rateLimiting')

        const createRateLimitMockResponse = () => {
            const headers: Record<string, unknown> = {}
            const res = {
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
            return res as unknown as unknown as Response
        }

        it('should rate limit independently per email for the same IP', async () => {
            const ip = '10.0.0.4'

            await realLoginRateLimiter(
                createMockRequest({
                    ip,
                    body: { email: 'login-limit-a@test.com' }
                }) as Request,
                createRateLimitMockResponse(),
                createMockNext()
            )

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realLoginRateLimiter(
                createMockRequest({
                    ip,
                    body: { email: 'login-limit-b@test.com' }
                }) as Request,
                res,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })
    })

    describe('signupRateLimiter behavior (real implementation) (L17)', () => {
        const { signupRateLimiter: realSignupRateLimiter } =
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

        it('blocks the 6th sign-up from one IP within the hour', async () => {
            const ip = '10.0.0.17'
            for (let i = 0; i < 5; i++) {
                const next = createMockNext()
                await realSignupRateLimiter(
                    createMockRequest({ ip }) as Request,
                    createRateLimitMockResponse(),
                    next
                )
                expect(next).toHaveBeenCalled()
            }

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realSignupRateLimiter(
                createMockRequest({ ip }) as Request,
                res,
                next
            )

            expect(next).not.toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.TOO_MANY_REQUESTS)
        })
    })

    describe('OTP rate limiters (real implementation) (L18)', () => {
        const {
            forgotPasswordRateLimiter: realForgotPasswordRateLimiter,
            verifyResetCodeRateLimiter: realVerifyResetCodeRateLimiter
        } = jest.requireActual('../../middlewares/rateLimiting')

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

        it('keeps a separate bucket per OTP route', async () => {
            const ip = '10.0.18.200'
            for (let i = 0; i < 6; i++) {
                await realForgotPasswordRateLimiter(
                    createMockRequest({ ip }) as Request,
                    createRateLimitMockResponse(),
                    createMockNext()
                )
            }

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realVerifyResetCodeRateLimiter(
                createMockRequest({ ip }) as Request,
                res,
                next
            )

            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })
    })

    describe('passwordChangeRateLimiter behavior (real implementation) (L18)', () => {
        const { passwordChangeRateLimiter: realPasswordChangeRateLimiter } =
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

        it('blocks the 6th attempt by one user even across IPs', async () => {
            const userId = 'password-change-user'
            for (let i = 0; i < 5; i++) {
                const next = createMockNext()
                await realPasswordChangeRateLimiter(
                    createMockRequest({ ip: `10.0.18.${i}`, userId }) as Request,
                    createRateLimitMockResponse(),
                    next
                )
                expect(next).toHaveBeenCalled()
            }

            const res = createRateLimitMockResponse()
            const next = createMockNext()
            await realPasswordChangeRateLimiter(
                createMockRequest({ ip: '10.0.18.99', userId }) as Request,
                res,
                next
            )

            expect(next).not.toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.TOO_MANY_REQUESTS)
        })
    })

    describe('sharePostRateLimiter behavior (real implementation)', () => {
        const { sharePostRateLimiter: realSharePostRateLimiter } =
            jest.requireActual('../../middlewares/rateLimiting')

        const createRateLimitMockResponse = () => {
            const headers: Record<string, unknown> = {}
            const res = {
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
            return res as unknown as unknown as Response
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
