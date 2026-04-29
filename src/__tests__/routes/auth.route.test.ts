// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

describe('Auth Routes', () => {
    // ==================== LOGIN ====================
    describe('POST /api/v1/auth/login', () => {
        const loginEndpoint = '/api/v1/auth/login'

        it(
            'should return 200 and token for valid credentials',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('user logged in!')
                expect(response.body.data)
                    .toHaveProperty('token')
                expect(response.body.data)
                    .toHaveProperty('_csrf')
                expect(response.headers['set-cookie'])
                    .toBeDefined()
                expect(response.headers['set-cookie'][0])
                    .toContain('accessToken')
            }
        )

        it(
            'should return 200 with remember option',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'Password123!',
                        remember: true
                    })

                expect(response.status).toBe(200)
                expect(response.body.data)
                    .toHaveProperty('token')
            }
        )

        it(
            'should return 400 for missing email',
            async () => {
                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].error)
                    .toContain('required')
                expect(response.body.error[0].property)
                    .toBe('email')
            }
        )

        it(
            'should return 400 for missing password',
            async () => {
                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].error)
                    .toContain('required')
                expect(response.body.error[0].property)
                    .toBe('password')
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'invalid-email',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('email')
            }
        )

        it(
            'should return 400 for password too short',
            async () => {
                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'short'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('password')
            }
        )

        it(
            'should return 401 for user not found',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'notfound@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(401)
                expect(response.body.error[0].statusType)
                    .toBe('Authentication Error')
                expect(response.body.error[0].error)
                    .toBe('User not found!')
            }
        )

        it(
            'should return 401 for invalid password',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'WrongPassword123!'
                    })

                expect(response.status).toBe(401)
                expect(response.body.error[0].statusType)
                    .toBe('Authentication Error')
            }
        )
    })

    // ==================== SIGNUP ====================
    describe('POST /api/v1/auth/signup', () => {
        const signupEndpoint = '/api/v1/auth/signup'

        it('should return 201 for valid signup', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.user.create
                .mockResolvedValue(createMockUser())

            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(201)
            expect(response.body.message)
                .toBe('user created!')
            expect(response.body.data)
                .toHaveProperty('user')
            expect(response.body.data.user)
                .not.toHaveProperty('password')
        })

        it(
            'should return 201 with optional username',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null)
                prismaMock.user.create.mockResolvedValue(
                    createMockUser(
                        { username: 'customuser' }
                    )
                )

                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        username: 'customuser',
                        email: 'john@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(201)
            }
        )

        it(
            'should return 400 for missing firstName',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        lastName: 'Doe',
                        email: 'john@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('firstName')
            }
        )

        it(
            'should return 400 for missing lastName',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        email: 'john@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('lastName')
            }
        )

        it(
            'should return 400 for missing email',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('email')
            }
        )

        it(
            'should return 400 for missing password',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@test.com'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('password')
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'invalid-email',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('email')
            }
        )

        it(
            'should return 400 for invalid firstName (non-alphanumeric)',
            async () => {
                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John@123',
                        lastName: 'Doe',
                        email: 'john@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('firstName')
            }
        )

        it(
            'should return 409 for existing user',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(createMockUser())

                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'test@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(409)
                expect(response.body.error[0].statusType)
                    .toBe('Conflict')
                expect(response.body.error[0].error)
                    .toBe('User already exists!')
            }
        )

        it(
            'should return 409 for existing username',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(
                        createMockUser(
                            { username: 'existinguser' }
                        )
                    )

                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'new@test.com',
                        username: 'existinguser',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(409)
                expect(response.body.error[0].statusType)
                    .toBe('Conflict')
                expect(response.body.error[0].error)
                    .toBe('Username already taken!')
            }
        )
    })

    // ==================== LOGOUT ====================
    describe('GET /api/v1/auth/logout', () => {
        it(
            'should return 200 and clear accessToken cookie',
            async () => {
                const response = await supertest(App)
                    .get('/api/v1/auth/logout')

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('user logged out!')
            }
        )

        it(
            'should clear both accessToken and _csrf cookies',
            async () => {
                const response = await supertest(App)
                    .get('/api/v1/auth/logout')

                expect(response.status).toBe(200)

                const setCookieHeaders =
                    response.headers['set-cookie'] || []

                const cookieHeaderText =
                    setCookieHeaders.join('; ')

                // Both cookies should be cleared (set with max-age=0)
                expect(cookieHeaderText)
                    .toContain('accessToken')
                expect(cookieHeaderText)
                    .toContain('_csrf')
            }
        )
    })

    // ==================== ME ====================
    describe('GET /api/v1/auth/me', () => {
        const meEndpoint = '/api/v1/auth/me'

        it(
            'should return 200 and user data for authenticated user',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('user info!')
                expect(response.body.data)
                    .toHaveProperty('user')
                expect(response.body.data.user.id)
                    .toBe(mockUser.id)
                expect(response.body.data.user.email)
                    .toBe(mockUser.email)
                expect(response.body.data.user)
                    .not.toHaveProperty('password')
            }
        )

        it(
            'should return 401 for missing token',
            async () => {
                const response = await supertest(App)
                    .get(meEndpoint)

                expect(response.status).toBe(401)
                expect(response.body.error[0].statusType)
                    .toBe('Unauthorized')
            }
        )

        it(
            'should return 401 for empty token',
            async () => {
                const response = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', ['accessToken='])

                expect(response.status).toBe(401)
                expect(response.body.error[0].statusType)
                    .toBe('Unauthorized')
            }
        )

        it(
            'should return 401 for invalid token',
            async () => {
                const response = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', ['accessToken=invalid-token'])

                expect(response.status).toBe(401)
                expect(response.body.error[0].statusType)
                    .toBe('Unauthorized')
            }
        )

        it(
            'should return 401 for expired token',
            async () => {
                const expiredToken =
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid'

                const response = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [
                        `accessToken=${expiredToken}`
                    ])

                expect(response.status).toBe(401)
            }
        )

        it(
            'should not return cached data for different users',
            async () => {
                // Setup two different users
                const user1 = createMockUser({
                    id: 'user-1',
                    email: 'user1@test.com',
                    firstName: 'User',
                    lastName: 'One'
                })

                const user2 = createMockUser({
                    id: 'user-2',
                    email: 'user2@test.com',
                    firstName: 'User',
                    lastName: 'Two'
                })

                // First call with user1
                const token1 = createAuthToken(user1)
                prismaMock.user.findUnique
                    .mockResolvedValue(user1)

                const response1 = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [`accessToken=${token1}`])

                expect(response1.status).toBe(200)
                expect(response1.body.data.user.id)
                    .toBe('user-1')

                // Second call with user2 (different token)
                // This should NOT return user1's cached data
                const token2 = createAuthToken(user2)
                prismaMock.user.findUnique
                    .mockResolvedValue(user2)

                const response2 = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [`accessToken=${token2}`])

                expect(response2.status).toBe(200)
                expect(response2.body.data.user.id)
                    .toBe('user-2')
                expect(response2.body.data.user.email)
                    .toBe('user2@test.com')

                // Verify they're different users
                expect(response2.body.data.user.id)
                    .not.toBe(response1.body.data.user.id)
            }
        )
    })

    // ==================== REFRESH ====================
    describe('GET /api/v1/auth/refresh', () => {
        const csrfEndpoint = '/api/v1/auth/refresh'

        it(
            'should return 200 and CSRF token for authenticated user',
            async () => {
                const mockUser = createMockUser()
                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .get(csrfEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.message)
                    .toBe('CSRF token generated!')
                expect(response.body.data)
                    .toHaveProperty('_csrf')
                expect(response.headers['set-cookie'])
                    .toBeDefined()
            }
        )

        it(
            'should return 401 for unauthenticated user',
            async () => {
                const response = await supertest(App)
                    .get(csrfEndpoint)

                expect(response.status).toBe(401)
            }
        )
    })

    // ==================== FORGOT PASSWORD ====================
    describe('GET /api/v1/auth/forgot-password/:email', () => {
        it(
            'should return 200 and send OTP for valid email',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)
                prismaMock.user.update
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .get(
                        '/api/v1/auth/forgot-password/test@test.com'
                    )

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 200 even when email is not registered',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null)

                const response = await supertest(App)
                    .get(
                        '/api/v1/auth/forgot-password/notfound@test.com'
                    )

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const response = await supertest(App)
                    .get(
                        '/api/v1/auth/forgot-password/invalid-email'
                    )

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )
    })

    // ==================== CONFIRM EMAIL ====================
    describe('POST /api/v1/auth/confirm-email', () => {
        const confirmEmailEndpoint = '/api/v1/auth/confirm-email'

        it(
            'should confirm email with valid OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    }
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP
                    })

                expect(response.status).toBe(201)
                expect(response.body.data.user.email).toBe(
                    mockUser.email
                )
            }
        )

        it(
            'should return 400 for expired OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() - 1000
                        )
                    }
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for wrong OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    }
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP: 999999
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 401 for non-existent user',
            async () => {
                prismaMock.user.findUnique.mockResolvedValue(
                    null
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: 'nonexistent@test.com',
                        OTP: 123456
                    })

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return 400 for missing email',
            async () => {
                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        OTP: 123456
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for missing OTP',
            async () => {
                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: 'test@test.com'
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: 'invalid-email',
                        OTP: 123456
                    })

                expect(response.status).toBe(400)
            }
        )
    })

    // ==================== RESET PASSWORD ====================
    describe('PUT /api/v1/auth/reset-password', () => {
        const resetPasswordEndpoint = '/api/v1/auth/reset-password'

        it(
            'should reset password with valid OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456
                const newPassword = 'NewPassword456!'

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    }
                )

                prismaMock.user.update.mockResolvedValue({
                    ...mockUser,
                    password: 'hashed-password',
                    passwordUpdatedAt: new Date()
                })

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword,
                        userOTP: OTP
                    })

                expect(response.status).toBe(200)
                expect(response.body.data.user.email).toBe(
                    mockUser.email
                )
                expect(
                    prismaMock.user.update
                ).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: {
                            id: mockUser.id,
                            active: true
                        }
                    })
                )
            }
        )

        it(
            'should return 400 for expired OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() - 1000
                        )
                    }
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'NewPassword456!',
                        userOTP: OTP
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for wrong OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    }
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'NewPassword456!',
                        userOTP: 999999
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 200 for non-existent email (user enumeration safety)',
            async () => {
                prismaMock.user.findUnique.mockResolvedValue(
                    null
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: 'nonexistent@test.com',
                        newPassword: 'NewPassword456!',
                        userOTP: 123456
                    })

                expect(response.status).toBe(200)
            }
        )

        it(
            'should return 400 for invalid password format',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        resetPasswordOTP: OTP,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    }
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'invalidpass',
                        userOTP: OTP
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for missing email',
            async () => {
                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        newPassword: 'NewPassword456!',
                        userOTP: 123456
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for missing newPassword',
            async () => {
                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: 'test@test.com',
                        userOTP: 123456
                    })

                expect(response.status).toBe(400)
            }
        )

        it(
            'should return 400 for missing userOTP',
            async () => {
                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: 'test@test.com',
                        newPassword: 'NewPassword456!'
                    })

                expect(response.status).toBe(400)
            }
        )
    })
})
