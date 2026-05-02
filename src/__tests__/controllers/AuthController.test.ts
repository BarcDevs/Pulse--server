import type { Request, Response } from 'express'

import * as authController from '../../controllers/authController'
import * as authOTP from '../../lib/authOTP'
import * as authServices from '../../services/authService'
import {
    createMockRequest,
    createMockResponse,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../services/authService', () => ({
    ...jest.requireActual('../../services/authService'),
    login: jest.fn(),
    signup: jest.fn(),
    getUser: jest.fn(),
    resetPassword: jest.fn(),
    deactivateUser: jest.fn()
}))

jest.mock('../../lib/authOTP', () => ({
    ...jest.requireActual('../../lib/authOTP'),
    sendForgotPasswordOTP: jest.fn(),
    sendConfirmEmailOTP: jest.fn(),
    removeResetPasswordOTP: jest.fn()
}))

const mockLogin = authServices.login as jest.MockedFunction<
    typeof authServices.login
>

describe('AuthController', () => {
    // ==================== LOGIN ====================
    describe('login', () => {
        it(
            'should login user and set cookies',
            async () => {
                const mockToken = 'mock-jwt-token'
                mockLogin
                    .mockResolvedValue(mockToken)

                const req = createMockRequest({
                    body: {
                        email: 'test@test.com',
                        password: 'Password123!',
                        remember: false
                    }
                }) as unknown as Request

                const res = createMockResponse() as unknown as Response

                await authController.login(req, res)

                expect(mockLogin).toHaveBeenCalledWith(
                    'test@test.com',
                    'Password123!'
                )
                expect(res.cookie).toHaveBeenCalledWith(
                    'accessToken',
                    mockToken,
                    expect.any(Object)
                )
                expect(res.cookie).toHaveBeenCalledWith(
                    '_csrf',
                    expect.any(String),
                    expect.any(Object)
                )
                expect(res.status)
                    .toHaveBeenCalledWith(200)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'user logged in!',
                        data: expect.objectContaining({
                            token: mockToken,
                            _csrf: expect.any(String)
                        })
                    })
                )
            }
        )

        it(
            'should throw validation error for invalid email',
            async () => {
                const req = createMockRequest({
                    body: {
                        email: 'invalid-email',
                        password: 'Password123!'
                    }
                }) as unknown as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.login(req, res)
                ).rejects.toThrow()
            }
        )

        it(
            'should throw validation error for missing password',
            async () => {
                const req = createMockRequest({
                    body: {
                        email: 'test@test.com'
                    }
                }) as unknown as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.login(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== SIGNUP ====================
    describe('signup', () => {
        it('should create new user', async () => {
            const mockUser = createMockUser()
            ;(authServices.signup as jest.Mock)
                .mockResolvedValue(mockUser)

            const req = createMockRequest({
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                }
            }) as Request

            const res = createMockResponse() as unknown as Response

            await authController.signup(req, res)

            expect(authServices.signup).toHaveBeenCalledWith(
                expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!',
                    username: expect.any(String)
                })
            )
            expect(res.status)
                .toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'user created!',
                    data: expect.objectContaining({
                        user: expect.not.objectContaining({
                            password: expect.any(String)
                        })
                    })
                })
            )
        })

        it(
            'should use provided username if given',
            async () => {
                const mockUser = createMockUser({
                    username: 'customuser'
                })
                ;(authServices.signup as jest.Mock)
                    .mockResolvedValue(mockUser)

                const req = createMockRequest({
                    body: {
                        firstName: 'John',
                        lastName: 'Doe',
                        username: 'customuser',
                        email: 'john@test.com',
                        password: 'Password123!'
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await authController.signup(req, res)

                expect(authServices.signup).toHaveBeenCalledWith(
                    expect.objectContaining({
                        username: 'customuser'
                    })
                )
            }
        )

        it(
            'should throw validation error for missing firstName',
            async () => {
                const req = createMockRequest({
                    body: {
                        lastName: 'Doe',
                        email: 'john@test.com',
                        password: 'Password123!'
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.signup(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== LOGOUT ====================
    describe('logout', () => {
        it('should clear accessToken cookie', async () => {
            const req = createMockRequest() as Request
            const res = createMockResponse() as unknown as Response

            await authController.logout(req, res)

            expect(res.clearCookie)
                .toHaveBeenCalledWith('accessToken')
            expect(res.status)
                .toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'user logged out!'
                })
            )
        })
    })

    // ==================== ME ====================
    describe('me', () => {
        it(
            'should return user info for authenticated user',
            async () => {
                const mockUser = createMockUser()
                ;(authServices.getUser as jest.Mock)
                    .mockResolvedValue(mockUser)

                const req = createMockRequest({
                    userId: 'test-user-id-123'
                }) as Request

                const res = createMockResponse() as unknown as Response

                await authController.me(req, res)

                expect(authServices.getUser).toHaveBeenCalledWith(
                    'id',
                    'test-user-id-123'
                )
                expect(res.status)
                    .toHaveBeenCalledWith(200)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'user info!',
                        data: expect.objectContaining({
                            user: expect.any(Object)
                        })
                    })
                )
            }
        )

        it(
            'should throw unauthorized error for missing userId',
            async () => {
                const req = createMockRequest({
                    userId: undefined
                }) as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.me(req, res)
                ).rejects.toThrow()
            }
        )

        it(
            'should throw unauthorized error for non-existent user',
            async () => {
                ;(authServices.getUser as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    userId: 'non-existent-id'
                }) as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.me(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== GET CSRF TOKEN ====================
    describe('getCsrfToken', () => {
        it(
            'should generate and return CSRF token',
            async () => {
                const req = createMockRequest() as Request
                const res = createMockResponse() as unknown as Response
                res.cookie = jest.fn().mockReturnThis()

                await authController.getCsrfToken(req, res)

                expect(res.cookie).toHaveBeenCalledWith(
                    '_csrf',
                    expect.any(String),
                    expect.any(Object)
                )
                expect(res.status)
                    .toHaveBeenCalledWith(200)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'CSRF token generated!',
                        data: expect.objectContaining({
                            _csrf: expect.any(String)
                        })
                    })
                )
            }
        )
    })

    // ==================== FORGOT PASSWORD ====================
    describe('forgotPassword', () => {
        it('should send OTP email', async () => {
            ;(authOTP.sendForgotPasswordOTP as jest.Mock)
                .mockResolvedValue(123456)

            const req = createMockRequest({
                params: {
                    email: 'test@test.com'
                }
            }) as Request

            const res = createMockResponse() as unknown as Response

            await authController.forgotPassword(req, res)

            expect(authOTP.sendForgotPasswordOTP).toHaveBeenCalledWith(
                'test@test.com'
            )
            expect(res.status)
                .toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('OTP')
                })
            )
        })

        it(
            'should throw validation error for invalid email',
            async () => {
                const req = createMockRequest({
                    params: {
                        email: 'invalid-email'
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await expect(
                    authController.forgotPassword(req, res)
                ).rejects.toThrow()
            }
        )
    })

    // ==================== CONFIRM EMAIL ====================
    describe('confirmEmail', () => {
        it(
            'should confirm email with valid OTP',
            async () => {
                const futureDate = new Date(
                    Date.now() + 1000 * 60 * 60
                )
                const mockUser = createMockUser({
                    resetPasswordOTP: 123456,
                    resetPasswordExpiration: futureDate
                })
                ;(authServices.getUser as jest.Mock)
                    .mockResolvedValue(mockUser)

                const req = createMockRequest({
                    body: {
                        email: 'test@test.com',
                        OTP: 123456
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await authController.confirmEmail(req, res)

                expect(authServices.getUser).toHaveBeenCalledWith(
                    'email',
                    'test@test.com'
                )
                expect(res.status)
                    .toHaveBeenCalledWith(201)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Your email is confirmed!'
                    })
                )
            }
        )

        it('should throw error for invalid OTP', async () => {
            const futureDate = new Date(
                Date.now() + 1000 * 60 * 60
            )
            const mockUser = createMockUser({
                resetPasswordOTP: 123456,
                resetPasswordExpiration: futureDate
            })
            ;(authServices.getUser as jest.Mock)
                .mockResolvedValue(mockUser)

            const req = createMockRequest({
                body: {
                    email: 'test@test.com',
                    OTP: 654321
                }
            }) as Request

            const res = createMockResponse() as unknown as Response

            await expect(
                authController.confirmEmail(req, res)
            ).rejects.toThrow()
        })

        it('should throw error for expired OTP', async () => {
            const pastDate = new Date(
                Date.now() - 1000 * 60 * 60
            )
            const mockUser = createMockUser({
                resetPasswordOTP: 123456,
                resetPasswordExpiration: pastDate
            })
            ;(authServices.getUser as jest.Mock)
                .mockResolvedValue(mockUser)

            const req = createMockRequest({
                body: {
                    email: 'test@test.com',
                    OTP: 123456
                }
            }) as Request

            const res = createMockResponse() as unknown as Response

            await expect(
                authController.confirmEmail(req, res)
            ).rejects.toThrow()
        })
    })

    // ==================== RESET PASSWORD ====================
    describe('resetPassword', () => {
        it(
            'should reset password with valid OTP',
            async () => {
                const futureDate = new Date(
                    Date.now() + 1000 * 60 * 60
                )
                const mockUser = createMockUser({
                    resetPasswordOTP: 123456,
                    resetPasswordExpiration: futureDate
                })
                ;(authServices.getUser as jest.Mock)
                    .mockResolvedValue(mockUser)
                ;(authServices.resetPassword as jest.Mock)
                    .mockResolvedValue(mockUser)
                ;(authOTP.removeResetPasswordOTP as jest.Mock)
                    .mockResolvedValue(undefined)

                const req = createMockRequest({
                    body: {
                        email: 'test@test.com',
                        newPassword: 'NewPassword1',
                        userOTP: 123456
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await authController.resetPassword(req, res)

                expect(authServices.resetPassword).toHaveBeenCalledWith(
                    mockUser.id,
                    'NewPassword1'
                )
                expect(authOTP.removeResetPasswordOTP)
                    .toHaveBeenCalledWith(mockUser.id)
                expect(res.status)
                    .toHaveBeenCalledWith(200)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Password has changed successfully!'
                    })
                )
            }
        )

        it('should throw error for invalid OTP', async () => {
            const futureDate = new Date(
                Date.now() + 1000 * 60 * 60
            )
            const mockUser = createMockUser({
                resetPasswordOTP: 123456,
                resetPasswordExpiration: futureDate
            })
            ;(authServices.getUser as jest.Mock)
                .mockResolvedValue(mockUser)

            const req = createMockRequest({
                body: {
                    email: 'test@test.com',
                    newPassword: 'NewPassword1',
                    userOTP: 654321
                }
            }) as Request

            const res = createMockResponse() as unknown as Response

            await expect(
                authController.resetPassword(req, res)
            ).rejects.toThrow()
        })

        it(
            'should return generic message for non-existent user',
            async () => {
                ;(authServices.getUser as jest.Mock)
                    .mockResolvedValue(null)

                const req = createMockRequest({
                    body: {
                        email: 'notfound@test.com',
                        newPassword: 'NewPassword1',
                        userOTP: 123456
                    }
                }) as Request

                const res = createMockResponse() as unknown as Response

                await authController.resetPassword(req, res)

                expect(res.status)
                    .toHaveBeenCalledWith(200)
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: expect.stringContaining('If the email exists')
                    })
                )
            }
        )
    })
})
