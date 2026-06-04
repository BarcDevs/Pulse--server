// @ts-nocheck
import * as googleAuthLib from 'google-auth-library'

import { AuthError } from '../../errors/AuthError'
import * as authModel from '../../models/authModel'
import {
    buildAuthUrl,
    exchangeCodeForTokens,
    fetchGoogleProfile,
    findOrCreateUser,
    generateState,
    validateState
} from '../../services/googleOAuthService'
import { prismaMock } from '../setup/jestSetup'
import { createMockUser } from '../setup/testSetup'

// OAuth2Client is instantiated at module level in googleOAuthService.
// Define mocks inside the factory to avoid hoisting issues, then expose
// them on the mock module so tests can configure per-call behavior.
jest.mock('google-auth-library', () => {
    const getToken = jest.fn()
    const verifyIdToken = jest.fn()
    const generateAuthUrl = jest.fn()
    return {
        OAuth2Client: jest.fn().mockImplementation(() => ({
            generateAuthUrl,
            getToken,
            verifyIdToken
        })),
        __mocks: { getToken, verifyIdToken, generateAuthUrl }
    }
})
const { getToken: mockGetToken, verifyIdToken: mockVerifyIdToken, generateAuthUrl: mockGenerateAuthUrl } =
    (googleAuthLib as any).__mocks

jest.mock('../../../config', () => ({
    googleOAuthConfig: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/google/callback'
    }
}))

jest.mock('../../models/authModel')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const mockGoogleProfile = {
    googleId: 'google-sub-123',
    email: 'user@test.com',
    firstName: 'John',
    lastName: 'Doe',
    picture: 'https://example.com/photo.jpg'
}

describe('GoogleOAuthService', () => {
    beforeEach(() => jest.clearAllMocks())

    // ==================== generateState ====================
    describe('generateState', () => {
        it('returns a 64-character hex string', () => {
            const state = generateState()

            expect(state).toHaveLength(64)
            expect(state).toMatch(/^[a-f0-9]{64}$/)
        })

        it('generates unique states on each call', () => {
            const state1 = generateState()
            const state2 = generateState()

            expect(state1).not.toBe(state2)
        })
    })

    // ==================== validateState ====================
    describe('validateState', () => {
        it('returns true when cookie and query state match', () => {
            const state = 'a'.repeat(64)

            expect(validateState(state, state)).toBe(true)
        })

        it('returns false when states do not match', () => {
            expect(validateState('a'.repeat(64), 'b'.repeat(64))).toBe(false)
        })

        it('returns false when cookieState is undefined', () => {
            expect(validateState(undefined, 'somestate')).toBe(false)
        })

        it('returns false when queryState is undefined', () => {
            expect(validateState('somestate', undefined)).toBe(false)
        })

        it('returns false when both are undefined', () => {
            expect(validateState(undefined, undefined)).toBe(false)
        })
    })

    // ==================== buildAuthUrl ====================
    describe('buildAuthUrl', () => {
        it('calls generateAuthUrl and returns the URL', () => {
            mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/auth?state=test')

            const url = buildAuthUrl('test-state')

            expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    state: 'test-state',
                    access_type: 'offline'
                })
            )
            expect(url).toBe('https://accounts.google.com/auth?state=test')
        })
    })

    // ==================== exchangeCodeForTokens ====================
    describe('exchangeCodeForTokens', () => {
        it('returns tokens on success', async () => {
            const tokens = { id_token: 'id-token-123', access_token: 'access-token' }
            mockGetToken.mockResolvedValue({ tokens })

            const result = await exchangeCodeForTokens('auth-code')

            expect(result).toEqual(tokens)
        })

        it('throws AuthError when token exchange fails', async () => {
            mockGetToken.mockRejectedValue(new Error('invalid_grant'))

            await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(AuthError)
        })
    })

    // ==================== fetchGoogleProfile ====================
    describe('fetchGoogleProfile', () => {
        it('returns profile on successful verification', async () => {
            const payload = {
                sub: 'google-sub-123',
                email: 'user@test.com',
                email_verified: true,
                given_name: 'John',
                family_name: 'Doe',
                picture: 'https://example.com/photo.jpg'
            }
            mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload })

            const profile = await fetchGoogleProfile('id-token')

            expect(profile.googleId).toBe('google-sub-123')
            expect(profile.email).toBe('user@test.com')
            expect(profile.firstName).toBe('John')
        })

        it('throws AuthError when payload is null', async () => {
            mockVerifyIdToken.mockResolvedValue({ getPayload: () => null })

            await expect(fetchGoogleProfile('id-token')).rejects.toThrow(AuthError)
        })

        it('throws AuthError when email is missing', async () => {
            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    sub: 'google-sub',
                    email: undefined,
                    email_verified: true
                })
            })

            await expect(fetchGoogleProfile('id-token')).rejects.toThrow(/Email not provided/)
        })

        it('throws AuthError when email is not verified', async () => {
            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    sub: 'google-sub',
                    email: 'user@test.com',
                    email_verified: false
                })
            })

            await expect(fetchGoogleProfile('id-token')).rejects.toThrow(/not verified/)
        })

        it('throws AuthError when verifyIdToken throws non-AuthError', async () => {
            mockVerifyIdToken.mockRejectedValue(new Error('Network error'))

            await expect(fetchGoogleProfile('id-token')).rejects.toThrow(AuthError)
        })

        it('re-throws AuthError directly without wrapping', async () => {
            const authErr = new AuthError('Email not provided by Google', undefined, 'OAuth Error', 401)
            mockVerifyIdToken.mockRejectedValue(authErr)

            await expect(fetchGoogleProfile('id-token')).rejects.toBe(authErr)
        })
    })

    // ==================== findOrCreateUser ====================
    describe('findOrCreateUser', () => {
        it('returns user when found by googleId', async () => {
            const existingUser = createMockUser({ id: 'google-user-id' })
            prismaMock.user.findUnique.mockResolvedValue(existingUser)

            const result = await findOrCreateUser(mockGoogleProfile)

            expect(result.id).toBe('google-user-id')
            expect(prismaMock.user.create).not.toHaveBeenCalled()
        })

        it('links googleId to existing email user when no googleId match', async () => {
            const emailUser = createMockUser({ id: 'email-user-id' })
            prismaMock.user.findUnique.mockResolvedValue(null)
            jest.spyOn(authModel, 'getUserByEmail').mockResolvedValue(emailUser)
            prismaMock.user.update.mockResolvedValue({ ...emailUser, googleId: mockGoogleProfile.googleId })
            prismaMock.profile.findUnique.mockResolvedValue({ image: null })
            prismaMock.profile.update.mockResolvedValue({})

            const result = await findOrCreateUser(mockGoogleProfile)

            expect(result.id).toBe('email-user-id')
            expect(prismaMock.user.update).toHaveBeenCalled()
        })

        it('creates new user when no existing match found', async () => {
            const newUser = createMockUser({ id: 'new-user-id' })
            prismaMock.user.findUnique.mockResolvedValue(null)
            jest.spyOn(authModel, 'getUserByEmail').mockResolvedValue(null)
            jest.spyOn(authModel, 'getUserByUsername').mockResolvedValue(null)
            prismaMock.user.create.mockResolvedValue(newUser)
            prismaMock.profile.create.mockResolvedValue({})

            const result = await findOrCreateUser(mockGoogleProfile)

            expect(prismaMock.user.create).toHaveBeenCalled()
            expect(result.id).toBe('new-user-id')
        })
    })
})
