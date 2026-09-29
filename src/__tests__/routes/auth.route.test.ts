import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { sendEmail } from '../../utils/emailSender'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createAuthToken,
    createMockUser,
    generateCsrfTokenPair,
    withCsrfAuth
} from '../setup/testSetup'

describe('Auth Routes', () => {
    // ==================== LOGIN ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/login`, () => {
        const loginEndpoint = `/api/${serverConfig.apiVersion}/auth/login`

        it(
            'should return 200 and set the session cookie for valid credentials',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message)
                    .toBe('user logged in!')
                expect(response.body.data)
                    .not.toHaveProperty('token')
                expect(response.headers['set-cookie'])
                    .toEqual(expect.arrayContaining([
                        expect.stringMatching(/^accessToken=/)
                    ]))
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
                    .mockResolvedValue(mockUser as never)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'Password123!',
                        remember: true
                    })

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.data)
                    .not.toHaveProperty('token')
                expect(response.headers['set-cookie'])
                    .toEqual(expect.arrayContaining([
                        expect.stringMatching(/^accessToken=/)
                    ]))
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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
                    .mockResolvedValue(null as never)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'notfound@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                expect(response.body.error[0].statusType)
                    .toBe('Authentication Error')
                expect(response.body.error[0].error)
                    .toBe('Invalid credentials! please try again!')
            }
        )

        it(
            'should return 401 for invalid password',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await supertest(App)
                    .post(loginEndpoint)
                    .send({
                        email: 'test@test.com',
                        password: 'WrongPassword123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                expect(response.body.error[0].statusType)
                    .toBe('Authentication Error')
            }
        )
    })

    // ==================== SIGNUP ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/signup`, () => {
        const signupEndpoint = `/api/${serverConfig.apiVersion}/auth/signup`

        it('should return 201 for valid signup', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null as never)
            prismaMock.user.create
                .mockResolvedValue(createMockUser() as never as never)

            const response = await supertest(App)
                .post(signupEndpoint)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@test.com',
                    password: 'Password123!'
                })

            expect(response.status).toBe(HttpStatusCodes.CREATED)
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
                    .mockResolvedValue(null as never)
                prismaMock.user.create.mockResolvedValue(
                    createMockUser(
                        { username: 'customuser' }
                    ) as never
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

                expect(response.status).toBe(HttpStatusCodes.CREATED)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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
                    .mockResolvedValue(createMockUser() as never as never)

                const response = await supertest(App)
                    .post(signupEndpoint)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'test@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.CONFLICT)
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
                    .mockResolvedValueOnce(null as never)
                    .mockResolvedValueOnce(
                        createMockUser(
                            { username: 'existinguser' }
                        ) as never
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

                expect(response.status).toBe(HttpStatusCodes.CONFLICT)
                expect(response.body.error[0].statusType)
                    .toBe('Conflict')
                expect(response.body.error[0].error)
                    .toBe('Username already taken!')
            }
        )
    })

    // ==================== LOGOUT ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/logout`, () => {
        const logoutEndpoint = `/api/${serverConfig.apiVersion}/auth/logout`

        const postLogout = () => {
            const { csrfSecret, csrfToken } = generateCsrfTokenPair()
            return supertest(App)
                .post(logoutEndpoint)
                .set('Cookie', [`_csrf=${csrfSecret}`])
                .set('x-csrf-token', csrfToken)
        }

        it(
            'should return 200 and clear accessToken cookie',
            async () => {
                const response = await postLogout()

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message)
                    .toBe('user logged out!')
            }
        )

        it(
            'should clear both accessToken and _csrf cookies',
            async () => {
                const response = await postLogout()

                expect(response.status).toBe(HttpStatusCodes.OK)

                const setCookieHeaders =
                    ([] as string[]).concat(response.headers['set-cookie'] || [])

                const cookieHeaderText =
                    setCookieHeaders.join('; ')

                // Both cookies should be cleared (set with max-age=0)
                expect(cookieHeaderText)
                    .toContain('accessToken')
                expect(cookieHeaderText)
                    .toContain('_csrf')
            }
        )

        it(
            'should reject logout without a CSRF token',
            async () => {
                const response = await supertest(App)
                    .post(logoutEndpoint)

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                expect(response.headers['set-cookie']).toBeUndefined()
            }
        )

        it(
            'should no longer accept GET',
            async () => {
                const response = await supertest(App)
                    .get(logoutEndpoint)

                expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
            }
        )
    })

    // ==================== ME ====================
    describe(`GET /api/${serverConfig.apiVersion}/auth/me`, () => {
        const meEndpoint = `/api/${serverConfig.apiVersion}/auth/me`

        it(
            'should return 200 and user data for authenticated user',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const token = createAuthToken(mockUser)

                const response = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(HttpStatusCodes.OK)
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

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
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

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
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

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
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

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
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
                    .mockResolvedValue(user1 as never)

                const response1 = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [`accessToken=${token1}`])

                expect(response1.status).toBe(HttpStatusCodes.OK)
                expect(response1.body.data.user.id)
                    .toBe('user-1')

                // Second call with user2 (different token)
                // This should NOT return user1's cached data
                const token2 = createAuthToken(user2)
                prismaMock.user.findUnique
                    .mockResolvedValue(user2 as never)

                const response2 = await supertest(App)
                    .get(meEndpoint)
                    .set('Cookie', [`accessToken=${token2}`])

                expect(response2.status).toBe(HttpStatusCodes.OK)
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
    describe(`GET /api/${serverConfig.apiVersion}/auth/refresh`, () => {
        const csrfEndpoint = `/api/${serverConfig.apiVersion}/auth/refresh`

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

                expect(response.status).toBe(HttpStatusCodes.OK)
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

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )
    })

    // ==================== FORGOT PASSWORD ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/forgot-password`, () => {
        it(
            'should return 200 and send OTP for valid email',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)
                prismaMock.user.update
                    .mockResolvedValue(mockUser as never)

                const response = await supertest(App)
                    .post(
                        `/api/${serverConfig.apiVersion}/auth/forgot-password`
                    )
                    .send({ email: 'test@test.com' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 200 even when email is not registered',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null as never)

                const response = await supertest(App)
                    .post(
                        `/api/${serverConfig.apiVersion}/auth/forgot-password`
                    )
                    .send({ email: 'notfound@test.com' })

                expect(response.status).toBe(HttpStatusCodes.OK)
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const response = await supertest(App)
                    .post(
                        `/api/${serverConfig.apiVersion}/auth/forgot-password`
                    )
                    .send({ email: 'invalid-email' })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )
    })

    // ==================== CONFIRM EMAIL ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/confirm-email`, () => {
        const confirmEmailEndpoint = `/api/${serverConfig.apiVersion}/auth/confirm-email`

        it(
            'should confirm email with valid OTP',
            async () => {
                const mockUser = createMockUser()
                const OTP = 123456

                prismaMock.user.findUnique.mockResolvedValue(
                    {
                        ...mockUser,
                        confirmEmailOTP: OTP,
                        confirmEmailExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    } as never
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP
                    })

                expect(response.status).toBe(HttpStatusCodes.CREATED)
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
                        confirmEmailOTP: OTP,
                        confirmEmailExpiration: new Date(
                            Date.now() - 1000
                        )
                    } as never
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP
                    })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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
                        confirmEmailOTP: OTP,
                        confirmEmailExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    } as never
                )

                const response = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP: 999999
                    })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )

        it(
            'should answer a non-existent user exactly like a wrong OTP',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                        ...mockUser,
                        confirmEmailOTP: 123456,
                        confirmEmailExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    } as never)

                const unknown = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: 'nonexistent@test.com',
                        OTP: 999999
                    })
                const wrongCode = await supertest(App)
                    .post(confirmEmailEndpoint)
                    .send({
                        email: mockUser.email,
                        OTP: 999999
                    })

                expect(unknown.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(unknown.status).toBe(wrongCode.status)
                expect(unknown.body).toEqual(wrongCode.body)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )
    })

    // ==================== CHANGE EMAIL ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/change-email`, () => {
        const endpoint = `/api/${serverConfig.apiVersion}/auth/change-email`

        it(
            'should return 200 and send OTP for valid request',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValueOnce(mockUser as never) // getUser by id
                    .mockResolvedValueOnce(null as never)     // email not taken
                prismaMock.user.update
                    .mockResolvedValue(mockUser as never)     // setEmailChangeOTP

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({
                    newEmail: 'newemail@test.com',
                    password: 'Password123!'
                })

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message).toBe(
                    'Verification code sent to your new email address!'
                )
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(endpoint)
                    .send({
                        newEmail: 'newemail@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 400 for missing newEmail',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ password: 'Password123!' })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('newEmail')
            }
        )

        it(
            'should return 400 for missing password',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ newEmail: 'newemail@test.com' })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('password')
            }
        )

        it(
            'should return 400 for invalid email format',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({
                    newEmail: 'not-an-email',
                    password: 'Password123!'
                })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('newEmail')
            }
        )

        it(
            'should return 401 for wrong password',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({
                    newEmail: 'newemail@test.com',
                    password: 'WrongPassword123!'
                })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
                expect(response.body.error[0].statusType)
                    .toBe('Authentication Error')
            }
        )

        it(
            'should return 409 when new email is already taken',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValueOnce(mockUser as never)          // getUser by id
                    .mockResolvedValueOnce(createMockUser() as never as never)  // email taken

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({
                    newEmail: 'taken@test.com',
                    password: 'Password123!'
                })

                expect(response.status).toBe(HttpStatusCodes.CONFLICT)
                expect(response.body.error[0].statusType)
                    .toBe('Conflict')
            }
        )
    })

    // ==================== CONFIRM EMAIL CHANGE ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/confirm-email-change`, () => {
        const endpoint = `/api/${serverConfig.apiVersion}/auth/confirm-email-change`

        it(
            'should return 200 and updated user on valid OTP',
            async () => {
                const OTP = 123456
                const pendingEmail = 'new@test.com'
                const mockUser = createMockUser({
                    emailChangeOTP: OTP,
                    emailChangeExpiration: new Date(
                        Date.now() + 10 * 60000
                    ),
                    pendingEmail
                })
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)
                prismaMock.user.update
                    .mockResolvedValue({ ...mockUser, email: pendingEmail } as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ OTP })

                expect(response.status).toBe(HttpStatusCodes.OK)
                expect(response.body.message)
                    .toBe('Email updated successfully!')
                expect(response.body.data.user.email)
                    .toBe(pendingEmail)
            }
        )

        it(
            'should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .post(endpoint)
                    .send({ OTP: 123456 })

                expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
            }
        )

        it(
            'should return 400 for missing OTP',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({})

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )

        it(
            'should return 400 for wrong OTP',
            async () => {
                const OTP = 123456
                const mockUser = createMockUser({
                    emailChangeOTP: OTP,
                    emailChangeExpiration: new Date(
                        Date.now() + 10 * 60000
                    ),
                    pendingEmail: 'new@test.com'
                })
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ OTP: 999999 })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )

        it(
            'should return 400 for expired OTP',
            async () => {
                const OTP = 123456
                const mockUser = createMockUser({
                    emailChangeOTP: OTP,
                    emailChangeExpiration: new Date(
                        Date.now() - 1000
                    ),
                    pendingEmail: 'new@test.com'
                })
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ OTP })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )

        it(
            'should return 400 when no pending email change exists',
            async () => {
                const mockUser = createMockUser()
                const { token, csrfSecret, csrfToken } =
                    createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser as never)

                const response = await withCsrfAuth(
                    supertest(App).post(endpoint),
                    token, csrfSecret, csrfToken
                ).send({ OTP: 123456 })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )
    })

    // ==================== RESET PASSWORD ====================
    describe(`POST /api/${serverConfig.apiVersion}/auth/verify-reset-code`, () => {
        const verifyResetCodeEndpoint = `/api/${serverConfig.apiVersion}/auth/verify-reset-code`
        const OTP = 123456

        const mockUserWithOTP = (expiresInMs: number, attempts = 0) => {
            const mockUser = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue({
                ...mockUser,
                resetPasswordOTP: OTP,
                resetPasswordExpiration: new Date(Date.now() + expiresInMs),
                resetPasswordAttempts: attempts
            } as never)
            return mockUser
        }

        it('returns 200 for a valid code without consuming it', async () => {
            const mockUser = mockUserWithOTP(10 * 60000)

            const response = await supertest(App)
                .post(verifyResetCodeEndpoint)
                .send({ email: mockUser.email, userOTP: OTP })

            expect(response.status).toBe(HttpStatusCodes.OK)
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('returns 400 and counts the attempt for a wrong code', async () => {
            const mockUser = mockUserWithOTP(10 * 60000)

            const response = await supertest(App)
                .post(verifyResetCodeEndpoint)
                .send({ email: mockUser.email, userOTP: 654321 })

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { resetPasswordAttempts: { increment: 1 } }
                })
            )
        })

        it('returns 400 for an expired code', async () => {
            const mockUser = mockUserWithOTP(-1000)

            const response = await supertest(App)
                .post(verifyResetCodeEndpoint)
                .send({ email: mockUser.email, userOTP: OTP })

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
        })

        it('returns the same 400 for an unknown email', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null as never)

            const response = await supertest(App)
                .post(verifyResetCodeEndpoint)
                .send({ email: 'nobody@test.com', userOTP: OTP })

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
        })

        it('returns 400 for a missing code', async () => {
            const response = await supertest(App)
                .post(verifyResetCodeEndpoint)
                .send({ email: 'user@test.com' })

            expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
        })
    })

    describe(`PUT /api/${serverConfig.apiVersion}/auth/reset-password`, () => {
        const resetPasswordEndpoint = `/api/${serverConfig.apiVersion}/auth/reset-password`

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
                    } as never
                )

                prismaMock.user.update.mockResolvedValue({
                    ...mockUser,
                    password: 'hashed-password',
                    passwordUpdatedAt: new Date()
                } as never)

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword,
                        userOTP: OTP
                    })

                expect(response.status).toBe(HttpStatusCodes.OK)
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
                    } as never
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'NewPassword456!',
                        userOTP: OTP
                    })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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
                    } as never
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'NewPassword456!',
                        userOTP: 999999
                    })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )

        it(
            'should answer a non-existent email exactly like a wrong code (user enumeration safety)',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                        ...mockUser,
                        resetPasswordOTP: 123456,
                        resetPasswordExpiration: new Date(
                            Date.now() + 10 * 60000
                        )
                    } as never)

                const unknown = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: 'nonexistent@test.com',
                        newPassword: 'NewPassword456!',
                        userOTP: 999999
                    })
                const wrongCode = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'NewPassword456!',
                        userOTP: 999999
                    })

                expect(unknown.status).toBe(HttpStatusCodes.BAD_REQUEST)
                expect(unknown.status).toBe(wrongCode.status)
                expect(unknown.body).toEqual(wrongCode.body)
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
                    } as never
                )

                const response = await supertest(App)
                    .put(resetPasswordEndpoint)
                    .send({
                        email: mockUser.email,
                        newPassword: 'invalidpass',
                        userOTP: OTP
                    })

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
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

                expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
            }
        )
    })

    // ==================== CASCADING SERVICE FAILURES ====================
    describe('Cascading service failure paths', () => {
        it(
            'POST /forgot-password returns 500 when email send fails',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique.mockResolvedValue(mockUser as never)
                prismaMock.user.update.mockResolvedValue(mockUser as never)
                jest.mocked(sendEmail).mockRejectedValue(new Error('ECONNREFUSED'))

                const response = await supertest(App)
                    .post(`/api/${serverConfig.apiVersion}/auth/forgot-password`)
                    .send({ email: 'test@test.com' })

                expect(response.status).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            }
        )

        it(
            'POST /signup returns 500 when Prisma create throws connection error',
            async () => {
                prismaMock.user.findUnique.mockResolvedValue(null as never)
                prismaMock.user.create.mockRejectedValue(new Error('ECONNREFUSED'))

                const response = await supertest(App)
                    .post(`/api/${serverConfig.apiVersion}/auth/signup`)
                    .send({
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            }
        )

        it(
            'POST /login returns 500 when Prisma throws connection error',
            async () => {
                prismaMock.user.findUnique.mockRejectedValue(new Error('ECONNREFUSED'))

                const response = await supertest(App)
                    .post(`/api/${serverConfig.apiVersion}/auth/login`)
                    .send({
                        email: 'test@test.com',
                        password: 'Password123!'
                    })

                expect(response.status).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            }
        )
    })
})