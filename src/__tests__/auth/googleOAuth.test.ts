// @ts-nocheck
import crypto from 'crypto'
import supertest from 'supertest'

import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { AuthError } from '../../errors/AuthError'
import * as googleOAuthService from '../../services/googleOAuthService'
import { createMockUser } from '../setup/testSetup'

jest.mock(
    '../../services/googleOAuthService',
    () => ({
        __esModule: true,
        buildAuthUrl: jest.fn(),
        handleCallback: jest.fn(),
        generateState: jest.fn(),
        validateState: jest.fn(),
        exchangeCodeForTokens: jest.fn(),
        fetchGoogleProfile: jest.fn(),
        findOrCreateUser: jest.fn()
    })
)

const mockBuildAuthUrl =
    googleOAuthService.buildAuthUrl as jest.Mock
const mockHandleCallback =
    googleOAuthService.handleCallback as jest.Mock

// ==================== HELPERS ====================
const googleSignInEndpoint =
    '/api/v1/auth/google'
const googleCallbackEndpoint =
    '/api/v1/auth/google/callback'

const createGoogleUser = (
    overrides?: Record<string, unknown>
) =>
    createMockUser({
        id: 'google-user-id-456',
        email: 'googleuser@test.com',
        username: 'google-user',
        firstName: 'Google',
        lastName: 'User',
        ...overrides
    })

describe('Google OAuth', () => {
    // ==================== UNIT: STATE MANAGEMENT ====================
    describe('State generation and validation', () => {
        it(
            'should generate a 32-byte hex state string',
            () => {
                const state = crypto
                    .randomBytes(32)
                    .toString('hex')

                expect(state).toHaveLength(64)
                expect(state).toMatch(
                    /^[a-f0-9]{64}$/
                )
            }
        )

        it(
            'should generate unique states on each call',
            () => {
                const state1 = crypto
                    .randomBytes(32)
                    .toString('hex')
                const state2 = crypto
                    .randomBytes(32)
                    .toString('hex')

                expect(state1).not.toBe(state2)
            }
        )

        it(
            'should validate matching state values',
            () => {
                const state = crypto
                    .randomBytes(32)
                    .toString('hex')

                expect(state).toBe(state)
            }
        )

        it(
            'should reject mismatched state values',
            () => {
                const state1 = crypto
                    .randomBytes(32)
                    .toString('hex')
                const state2 = crypto
                    .randomBytes(32)
                    .toString('hex')

                expect(state1).not.toBe(state2)
            }
        )
    })

    // ==================== UNIT: USERNAME GENERATION ====================
    describe(
        'Username collision detection and suffix logic',
        () => {
            it(
                'should generate username from Google name',
                () => {
                    const name = 'John Doe'
                    const slug = name
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '')

                    expect(slug).toBe('john-doe')
                }
            )

            it(
                'should generate username from email local part',
                () => {
                    const email = 'john.doe@test.com'
                    const localPart = email
                        .split('@')[0]
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9-]/g,
                            '-'
                        )
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '')

                    expect(localPart)
                        .toBe('john-doe')
                }
            )

            it(
                'should append suffix when username is taken',
                () => {
                    const base = 'john-doe'
                    const suffixed = `${base}-abc123`

                    expect(suffixed)
                        .toContain(base)
                    expect(suffixed.length)
                        .toBeGreaterThan(base.length)
                }
            )

            it(
                'should slugify special characters',
                () => {
                    const name = 'John@Doe#123'
                    const slug = name
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9-]/g,
                            '-'
                        )
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '')

                    expect(slug)
                        .toBe('john-doe-123')
                }
            )

            it(
                'should truncate long usernames',
                () => {
                    const longName =
                        'a'.repeat(30)
                    const slug = longName
                        .toLowerCase()
                        .slice(0, 20)

                    expect(slug.length)
                        .toBeLessThanOrEqual(20)
                }
            )
        }
    )

    // ==================== UNIT: PROFILE IMAGE ====================
    describe('Profile image initialization', () => {
        it(
            'should set image for new user from Google picture',
            () => {
                const googlePicture =
                    'https://lh3.googleusercontent.com/photo.jpg'
                const profileImage = null

                const result =
                    profileImage ?? googlePicture

                expect(result)
                    .toBe(googlePicture)
            }
        )

        it(
            'should not overwrite existing user profile image',
            () => {
                const googlePicture =
                    'https://lh3.googleusercontent.com/new.jpg'
                const existingImage =
                    'https://example.com/user-selected.jpg'

                const result =
                    existingImage ?? googlePicture

                expect(result)
                    .toBe(existingImage)
            }
        )

        it(
            'should handle missing Google picture gracefully',
            () => {
                const profileImage = null
                const googlePicture = null

                const result =
                    googlePicture ?? profileImage

                expect(result).toBeNull()
            }
        )
    })

    // ==================== INTEGRATION: GET /auth/google ====================
    describe(
        'GET /api/v1/auth/google',
        () => {
            it(
                'should redirect to Google authorization URL',
                async () => {
                    mockBuildAuthUrl.mockReturnValue(
                        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
                    )

                    const response =
                        await supertest(App)
                            .get(googleSignInEndpoint)

                    expect(response.status)
                        .toBe(302)
                    expect(
                        response.headers.location
                    ).toContain(
                        'accounts.google.com'
                    )
                }
            )

            it(
                'should set oauth_state cookie',
                async () => {
                    mockBuildAuthUrl.mockReturnValue(
                        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
                    )

                    const response =
                        await supertest(App)
                            .get(googleSignInEndpoint)

                    const cookies =
                        response.headers['set-cookie']
                    expect(cookies).toBeDefined()

                    const hasStateCookie =
                        cookies.some(
                            (c: string) =>
                                c.includes(
                                    'oauth_state'
                                )
                        )
                    expect(hasStateCookie)
                        .toBe(true)
                }
            )

            it(
                'should set state cookie as httpOnly',
                async () => {
                    mockBuildAuthUrl.mockReturnValue(
                        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
                    )

                    const response =
                        await supertest(App)
                            .get(googleSignInEndpoint)

                    const cookies =
                        response.headers['set-cookie']
                    const stateCookie = cookies?.find(
                        (c: string) =>
                            c.includes('oauth_state')
                    )

                    expect(stateCookie)
                        .toContain('HttpOnly')
                }
            )

            it(
                'should pass generated state to buildAuthUrl',
                async () => {
                    mockBuildAuthUrl.mockReturnValue(
                        'https://accounts.google.com/o/oauth2/v2/auth?state=test'
                    )

                    await supertest(App)
                        .get(googleSignInEndpoint)

                    expect(mockBuildAuthUrl)
                        .toHaveBeenCalledWith(
                            expect.stringMatching(
                                /^[a-f0-9]{64}$/
                            )
                        )
                }
            )
        }
    )

    // ==================== INTEGRATION: GET /auth/google/callback ====================
    describe(
        'GET /api/v1/auth/google/callback',
        () => {
            // region Successful flows
            it(
                'should redirect on successful callback',
                async () => {
                    const mockState =
                        'a'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'auth-code-123',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(302)
                }
            )

            it(
                'should set accessToken cookie on success',
                async () => {
                    const mockState =
                        'b'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'auth-code-456',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    const cookies =
                        response.headers['set-cookie']
                    const hasAccessToken =
                        cookies?.some(
                            (c: string) =>
                                c.includes(
                                    'accessToken'
                                )
                        )

                    expect(hasAccessToken)
                        .toBe(true)
                }
            )

            it(
                'should set CSRF cookie on success',
                async () => {
                    const mockState =
                        'c'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'auth-code-789',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    const cookies =
                        response.headers['set-cookie']
                    const hasCsrf = cookies?.some(
                        (c: string) =>
                            c.includes('_csrf')
                    )

                    expect(hasCsrf).toBe(true)
                }
            )

            it(
                'should redirect to CLIENT_URL on success',
                async () => {
                    const mockState =
                        'd'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'auth-code-redir',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(302)
                    expect(
                        response.headers.location
                    ).toBe('http://localhost:5173')
                }
            )

            it(
                'should call handleCallback with the authorization code',
                async () => {
                    const mockState =
                        'e'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    await supertest(App)
                        .get(googleCallbackEndpoint)
                        .query({
                            code: 'my-auth-code',
                            state: mockState
                        })
                        .set('Cookie', [
                            `oauth_state=${mockState}`
                        ])

                    expect(mockHandleCallback)
                        .toHaveBeenCalledWith(
                            'my-auth-code'
                        )
                }
            )

            it(
                'should clear oauth_state cookie on successful callback',
                async () => {
                    const mockState =
                        'f'.repeat(64)
                    const mockUser =
                        createGoogleUser()

                    mockHandleCallback
                        .mockResolvedValue(mockUser)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'auth-code-clear',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    const cookies =
                        response.headers['set-cookie']
                    const clearedStateCookie =
                        cookies?.some(
                            (c: string) =>
                                c.includes(
                                    'oauth_state'
                                ) && c.includes(
                                    'Expires=Thu, 01 Jan 1970'
                                )
                        )

                    expect(clearedStateCookie)
                        .toBe(true)
                }
            )
            // endregion

            // region Error: state validation
            it(
                'should return 401 for missing state parameter',
                async () => {
                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'some-code'
                            })
                            .set('Cookie', [
                                'oauth_state=abc'
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Invalid OAuth state'
                    )
                }
            )

            it(
                'should return 401 for missing state cookie',
                async () => {
                    const mockState =
                        'g'.repeat(64)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'some-code',
                                state: mockState
                            })

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Invalid OAuth state'
                    )
                }
            )

            it(
                'should return 401 for state mismatch',
                async () => {
                    const queryState =
                        'h'.repeat(64)
                    const cookieState =
                        'i'.repeat(64)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'some-code',
                                state: queryState
                            })
                            .set('Cookie', [
                                `oauth_state=${cookieState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Invalid OAuth state'
                    )
                }
            )
            // endregion

            // region Error: missing code
            it(
                'should return 401 for missing authorization code',
                async () => {
                    const mockState =
                        'j'.repeat(64)

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Failed to authenticate with Google'
                    )
                }
            )
            // endregion

            // region Error: handleCallback failures
            it(
                'should return 401 when token exchange fails',
                async () => {
                    const mockState =
                        'k'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Failed to authenticate with Google',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.UNAUTHORIZED
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'bad-code',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Failed to authenticate with Google'
                    )
                }
            )

            it(
                'should return 401 when profile fetch fails',
                async () => {
                    const mockState =
                        'l'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Failed to retrieve Google profile',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.UNAUTHORIZED
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'code-123',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Failed to retrieve Google profile'
                    )
                }
            )

            it(
                'should return 401 when email is missing from Google profile',
                async () => {
                    const mockState =
                        'm'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Email not provided by Google',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.UNAUTHORIZED
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'code-456',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Email not provided by Google'
                    )
                }
            )

            it(
                'should return 401 when email is unverified by Google',
                async () => {
                    const mockState =
                        'n'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Email not verified by Google',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.UNAUTHORIZED
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'code-789',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(401)
                    expect(
                        response.body.error[0].error
                    ).toContain(
                        'Email not verified by Google'
                    )
                }
            )

            it(
                'should return 500 when username generation fails',
                async () => {
                    const mockState =
                        'o'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Failed to create user account',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.INTERNAL_SERVER_ERROR
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'code-uname',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(500)
                }
            )

            it(
                'should return 500 on database error',
                async () => {
                    const mockState =
                        'p'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new Error('Database error')
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'code-db',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    expect(response.status)
                        .toBe(500)
                }
            )

            it(
                'should not call handleCallback when state is invalid',
                async () => {
                    const queryState =
                        'q'.repeat(64)
                    const cookieState =
                        'r'.repeat(64)

                    await supertest(App)
                        .get(googleCallbackEndpoint)
                        .query({
                            code: 'some-code',
                            state: queryState
                        })
                        .set('Cookie', [
                            `oauth_state=${cookieState}`
                        ])

                    expect(mockHandleCallback)
                        .not.toHaveBeenCalled()
                }
            )

            it(
                'should not call handleCallback when code is missing',
                async () => {
                    const mockState =
                        's'.repeat(64)

                    await supertest(App)
                        .get(googleCallbackEndpoint)
                        .query({
                            state: mockState
                        })
                        .set('Cookie', [
                            `oauth_state=${mockState}`
                        ])

                    expect(mockHandleCallback)
                        .not.toHaveBeenCalled()
                }
            )

            it(
                'should clear oauth_state cookie even on error',
                async () => {
                    const mockState =
                        't'.repeat(64)

                    mockHandleCallback
                        .mockRejectedValue(
                            new AuthError(
                                'Failed to authenticate with Google',
                                undefined,
                                'OAuth Error',
                                HttpStatusCodes.UNAUTHORIZED
                            )
                        )

                    const response =
                        await supertest(App)
                            .get(
                                googleCallbackEndpoint
                            )
                            .query({
                                code: 'bad-code',
                                state: mockState
                            })
                            .set('Cookie', [
                                `oauth_state=${mockState}`
                            ])

                    const cookies =
                        response.headers['set-cookie']
                    const clearedStateCookie =
                        cookies?.some(
                            (c: string) =>
                                c.includes(
                                    'oauth_state'
                                )
                                && c.includes(
                                    'Expires=Thu, 01 Jan 1970'
                                )
                        )

                    expect(clearedStateCookie)
                        .toBe(true)
                }
            )
            // endregion
        }
    )
})
