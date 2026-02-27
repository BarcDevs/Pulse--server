// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import {prismaMock} from '../setup/jestSetup'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

describe('Auth Routes', () => {
    // ==================== LOGIN ====================
    describe('POST /api/v1/auth/login', () => {
        const loginEndpoint = '/api/v1/auth/login'

        it('should return 200 and token for valid credentials', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(mockUser)

            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('user logged in!')
            expect(response.body.data).toHaveProperty('token')
            expect(response.body.data).toHaveProperty('_csrf')
            expect(response.headers[ 'set-cookie' ]).toBeDefined()
            expect(response.headers[ 'set-cookie' ][ 0 ]).toContain('accessToken')
        })

        it('should return 200 with remember option', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(mockUser)

            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.com',
                    password: 'Password123!',
                    remember: true
                })

            expect(response.status).toBe(200)
            expect(response.body.data).toHaveProperty('token')
        })

        it('should return 403 for missing email', async () => {
            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].error).toContain('required')
            expect(response.body.error[ 0 ].property).toBe('email')
        })

        it('should return 403 for missing password', async () => {
            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.com'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].error).toContain('required')
            expect(response.body.error[ 0 ].property).toBe('password')
        })

        it('should return 403 for invalid email format', async () => {
            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'invalid-email',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('email')
        })

        it('should return 403 for email with invalid TLD', async () => {
            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.org',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('email')
        })

        it('should return 403 for password too short', async () => {
            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.com',
                    password: 'short'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('password')
        })

        it('should return 401 for user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'notfound@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(401)
            expect(response.body.error[ 0 ].statusType).toBe('Authentication Error')
            expect(response.body.error[ 0 ].error).toBe('User not found!')
        })

        it('should return 401 for invalid password', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(mockUser)

            const response = await supertest(App)
                .post(loginEndpoint)
                .send({
                    email: 'test@test.com',
                    password: 'WrongPassword123!'
                })

            expect(response.status).toBe(401)
            expect(response.body.error[ 0 ].statusType).toBe('Authentication Error')
        })
    })

    // ==================== SIGNUP ====================
    describe('POST /api/v1/auth/signup', () => {
        const signupEndpoint = '/api/v1/auth/signup'

        it('should return 201 for valid signup', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.user.create.mockResolvedValue(createMockUser())

            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('user created!')
            expect(response.body.data).toHaveProperty('user')
            expect(response.body.data.user).not.toHaveProperty('password')
        })

        it('should return 201 with optional username', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.user.create.mockResolvedValue(createMockUser({ username: 'customuser' }))

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
        })

        it('should return 403 for missing firstName', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('firstName')
        })

        it('should return 403 for missing lastName', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('lastName')
        })

        it('should return 403 for missing email', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('email')
        })

        it('should return 403 for missing password', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('password')
        })

        it('should return 403 for invalid email format', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'invalid-email',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('email')
        })

        it('should return 403 for invalid firstName (non-alphanumeric)', async () => {
            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John@123',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
            expect(response.body.error[ 0 ].property).toBe('firstName')
        })

        it('should return 409 for existing user', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser())

            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'test@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(409)
            expect(response.body.error[ 0 ].statusType).toBe('Conflict')
            expect(response.body.error[ 0 ].error).toBe('User already exists!')
        })
    })

    // ==================== LOGOUT ====================
    describe('GET /api/v1/auth/logout', () => {
        it('should return 200 and clear accessToken cookie', async () => {
            const response = await supertest(App)
                .get('/api/v1/auth/logout')

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('user logged out!')
        })
    })

    // ==================== ME ====================
    describe('GET /api/v1/auth/me', () => {
        const meEndpoint = '/api/v1/auth/me'

        it('should return 200 and user data for authenticated user', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(mockUser)

            const token = createAuthToken(mockUser)

            const response = await supertest(App)
                .get(meEndpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('user info!')
            expect(response.body.data).toHaveProperty('user')
            expect(response.body.data.user.id).toBe(mockUser.id)
            expect(response.body.data.user.email).toBe(mockUser.email)
            expect(response.body.data.user).not.toHaveProperty('password')
        })

        it('should return 401 for missing token', async () => {
            const response = await supertest(App)
                .get(meEndpoint)

            expect(response.status).toBe(401)
            expect(response.body.error[ 0 ].statusType).toBe('Unauthorized')
        })

        it('should return 401 for empty token', async () => {
            const response = await supertest(App)
                .get(meEndpoint)
                .set('Cookie', ['accessToken='])

            expect(response.status).toBe(401)
            expect(response.body.error[ 0 ].statusType).toBe('Unauthorized')
        })

        it('should return 401 for invalid token', async () => {
            const response = await supertest(App)
                .get(meEndpoint)
                .set('Cookie', ['accessToken=invalid-token'])

            expect(response.status).toBe(401)
            expect(response.body.error[ 0 ].statusType).toBe('Unauthorized')
        })

        it('should return 401 for expired token', async () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid'

            const response = await supertest(App)
                .get(meEndpoint)
                .set('Cookie', [`accessToken=${expiredToken}`])

            expect(response.status).toBe(401)
        })
    })

    // ==================== CSRF ====================
    describe('GET /api/v1/auth/csrf', () => {
        const csrfEndpoint = '/api/v1/auth/csrf'

        it('should return 200 and CSRF token for authenticated user', async () => {
            const mockUser = createMockUser()
            const token = createAuthToken(mockUser)

            const response = await supertest(App)
                .get(csrfEndpoint)
                .set('Cookie', [`accessToken=${token}`])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('CSRF token generated!')
            expect(response.body.data).toHaveProperty('_csrf')
            expect(response.headers[ 'set-cookie' ]).toBeDefined()
        })

        it('should return 401 for unauthenticated user', async () => {
            const response = await supertest(App)
                .get(csrfEndpoint)

            expect(response.status).toBe(401)
        })
    })

    // ==================== FORGET PASSWORD ====================
    describe('GET /api/v1/auth/forget-password/:email', () => {
        it('should return 403 due to body validation bug (email in URL not body)', async () => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            prismaMock.user.update.mockResolvedValue(mockUser)

            const response = await supertest(App)
                .get('/api/v1/auth/forget-password/test@test.com')

            expect(response.status).toBe(403)
        })

        it('should return 403 for any email (body validation)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await supertest(App)
                .get('/api/v1/auth/forget-password/notfound@test.com')

            expect(response.status).toBe(403)
        })

        it('should return 403 for invalid email format', async () => {
            const response = await supertest(App)
                .get('/api/v1/auth/forget-password/invalid-email')

            expect(response.status).toBe(403)
            expect(response.body.error[ 0 ].statusType).toBe('Validation Error')
        })

        it('should return 403 for email with invalid TLD', async () => {
            const response = await supertest(App)
                .get('/api/v1/auth/forget-password/test@test.org')

            expect(response.status).toBe(403)
        })
    })

    // ==================== CONFIRM EMAIL ====================
    describe('POST /api/v1/auth/confirm-email', () => {
        const confirmEmailEndpoint = '/api/v1/auth/confirm-email'

        it('should return 401 without valid CSRF token', async () => {
            const futureDate = new Date(Date.now() + 1000 * 60 * 60)
            const mockUser = createMockUser({
                resetPasswordOTP: 123456,
                resetPasswordExpiration: futureDate
            })
            prismaMock.user.findUnique.mockResolvedValue(mockUser)

            const response = await supertest(App)
                .post(confirmEmailEndpoint)
                .send({
                    email: 'test@test.com',
                    OTP: 123456
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for missing email (CSRF fails first)', async () => {
            const response = await supertest(App)
                .post(confirmEmailEndpoint)
                .send({
                    OTP: 123456
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for missing OTP (CSRF fails first)', async () => {
            const response = await supertest(App)
                .post(confirmEmailEndpoint)
                .send({
                    email: 'test@test.com'
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for invalid email format (CSRF fails first)', async () => {
            const response = await supertest(App)
                .post(confirmEmailEndpoint)
                .send({
                    email: 'invalid-email',
                    OTP: 123456
                })

            expect(response.status).toBe(401)
        })
    })

    // ==================== RESET PASSWORD ====================
    describe('PUT /api/v1/auth/reset-password', () => {
        const resetPasswordEndpoint = '/api/v1/auth/reset-password'

        it('should return 401 for missing email (CSRF fails first)', async () => {
            const response = await supertest(App)
                .put(resetPasswordEndpoint)
                .send({
                    newPassword: 'NewPassword123!',
                    userOTP: 123456
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for missing newPassword (CSRF fails first)', async () => {
            const response = await supertest(App)
                .put(resetPasswordEndpoint)
                .send({
                    email: 'test@test.com',
                    userOTP: 123456
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for missing userOTP (CSRF fails first)', async () => {
            const response = await supertest(App)
                .put(resetPasswordEndpoint)
                .send({
                    email: 'test@test.com',
                    newPassword: 'NewPassword123!'
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for invalid email format (CSRF fails first)', async () => {
            const response = await supertest(App)
                .put(resetPasswordEndpoint)
                .send({
                    email: 'invalid-email',
                    newPassword: 'NewPassword123!',
                    userOTP: 123456
                })

            expect(response.status).toBe(401)
        })

        it('should return 401 for extra fields (CSRF fails first)', async () => {
            const response = await supertest(App)
                .put(resetPasswordEndpoint)
                .send({
                    email: 'test@test.com',
                    newPassword: 'NewPassword123!',
                    userOTP: 123456,
                    extraField: 'not allowed'
                })

            expect(response.status).toBe(401)
        })
    })
})
