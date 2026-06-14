// @ts-nocheck
import jwt from 'jsonwebtoken'

import {
    comparePassword,
    createToken,
    hashPassword
} from '../../lib/authCrypto'
import { generateCSRFToken } from '../../lib/authCSRF'
import {
    generateRandomUsername,
    getCookiesOptions,
    sanitizeUserData
} from '../../lib/authHelpers'
import { verifyOTP } from '../../lib/authOTP'
import { getTimezoneFromIp } from '../../lib/geoLocation'
import {
    deactivateUser,
    getUser,
    login,
    resetPassword,
    signup,
    updateEmail
} from '../../services/authService'
import { prismaMock } from '../setup/jestSetup'
import { createMockUser } from '../setup/testSetup'

jest.mock('../../lib/geoLocation')

describe('Auth Service', () => {
    // ==================== hashPassword ====================
    describe('hashPassword', () => {
        it('should return a hashed string', () => {
            const password = 'TestPassword123!'
            const hashed = hashPassword(password)

            expect(hashed).toBeDefined()
            expect(typeof hashed).toBe('string')
            expect(hashed).not.toBe(password)
            expect(hashed.length).toBeGreaterThan(0)
        })

        it(
            'should return different hashes for same password',
            () => {
                const password = 'TestPassword123!'
                const hash1 = hashPassword(password)
                const hash2 = hashPassword(password)

                expect(hash1).not.toBe(hash2)
            }
        )
    })

    // ==================== comparePassword ====================
    describe('comparePassword', () => {
        it(
            'should return true for valid password match',
            () => {
                const password = 'TestPassword123!'
                const hashed = hashPassword(password)

                const result = comparePassword(
                    password,
                    hashed
                )

                expect(result).toBe(true)
            }
        )

        it(
            'should return false for invalid password match',
            () => {
                const password = 'TestPassword123!'
                const wrongPassword = 'WrongPassword456'
                const hashed = hashPassword(password)

                const result = comparePassword(
                    wrongPassword,
                    hashed
                )

                expect(result).toBe(false)
            }
        )

        it('should return false for empty password', () => {
            const password = 'TestPassword123!'
            const hashed = hashPassword(password)

            const result = comparePassword('', hashed)

            expect(result).toBe(false)
        })
    })

    // ==================== createToken ====================
    describe('createToken', () => {
        it('should return a valid JWT token', () => {
            const mockUser = createMockUser()

            const token = createToken(mockUser)

            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
            expect(token.split('.')).toHaveLength(3)
        })

        it(
            'should include user id and email in token payload',
            () => {
                const mockUser = createMockUser()

                const token = createToken(mockUser)
                const decoded = jwt.decode(token) as {
                    id: string
                    email: string
                }

                expect(decoded.id).toBe(mockUser.id)
                expect(decoded.email).toBe(mockUser.email)
            }
        )

        it('should include expiration in token', () => {
            const mockUser = createMockUser()

            const token = createToken(mockUser)
            const decoded = jwt.decode(token) as {
                exp: number
            }

            expect(decoded.exp).toBeDefined()
            expect(decoded.exp)
                .toBeGreaterThan(Date.now() / 1000)
        })
    })

    // ==================== generateCSRFToken ====================
    describe('generateCSRFToken', () => {
        it(
            'should return csrfSecret and csrfToken',
            () => {
                const result = generateCSRFToken()

                expect(result).toHaveProperty('csrfSecret')
                expect(result).toHaveProperty('csrfToken')
                expect(typeof result.csrfSecret).toBe('string')
                expect(typeof result.csrfToken).toBe('string')
            }
        )

        it(
            'should generate different tokens on each call',
            () => {
                const result1 = generateCSRFToken()
                const result2 = generateCSRFToken()

                expect(result1.csrfSecret)
                    .not.toBe(result2.csrfSecret)
                expect(result1.csrfToken)
                    .not.toBe(result2.csrfToken)
            }
        )
    })

    // ==================== getCookiesOptions ====================
    describe('getCookiesOptions', () => {
        it('should return httpOnly cookie options', () => {
            const options = getCookiesOptions(false)

            expect(options.httpOnly).toBe(true)
        })

        it(
            'should return longer or equal maxAge when remember is true',
            () => {
                const rememberOptions = getCookiesOptions(true)
                const noRememberOptions = getCookiesOptions(false)

                expect(rememberOptions.maxAge)
                    .toBeGreaterThanOrEqual(
                        noRememberOptions.maxAge as number
                    )
            }
        )

        it('should include sameSite option', () => {
            const options = getCookiesOptions(false)

            expect(options.sameSite).toBeDefined()
        })
    })

    // ==================== sanitizeUserData ====================
    describe('sanitizeUserData', () => {
        it('should remove password from user data', () => {
            const mockUser = createMockUser()

            const sanitized = sanitizeUserData(mockUser)

            expect(sanitized).not.toHaveProperty('password')
        })

        it(
            'should remove resetPasswordOTP from user data',
            () => {
                const mockUser = createMockUser({
                    resetPasswordOTP: 123456
                })

                const sanitized = sanitizeUserData(mockUser)

                expect(sanitized)
                    .not.toHaveProperty('resetPasswordOTP')
            }
        )

        it(
            'should remove resetPasswordExpiration from user data',
            () => {
                const mockUser = createMockUser({
                    resetPasswordExpiration: new Date()
                })

                const sanitized = sanitizeUserData(mockUser)

                expect(sanitized)
                    .not.toHaveProperty('resetPasswordExpiration')
            }
        )

        it('should keep public fields', () => {
            const mockUser = createMockUser()

            const sanitized = sanitizeUserData(mockUser)

            expect(sanitized.id).toBe(mockUser.id)
            expect(sanitized.firstName)
                .toBe(mockUser.firstName)
            expect(sanitized.lastName)
                .toBe(mockUser.lastName)
            expect(sanitized.email).toBe(mockUser.email)
            expect(sanitized.username)
                .toBe(mockUser.username)
        })
    })

    // ==================== generateRandomUsername ====================
    describe('generateRandomUsername', () => {
        it('should return string starting with user', () => {
            const username = generateRandomUsername()

            expect(username).toMatch(/^user\d+$/)
        })

        it(
            'should generate different usernames on each call',
            () => {
                const username1 = generateRandomUsername()
                const username2 = generateRandomUsername()

                expect(username1).not.toBe(username2)
            }
        )
    })

    // ==================== verifyOTP ====================
    describe('verifyOTP', () => {
        it(
            'should return true for valid OTP and not expired',
            () => {
                const futureDate = new Date(
                    Date.now() + 1000 * 60 * 60
                )
                const otp = 123456

                const result = verifyOTP(
                    otp,
                    futureDate,
                    otp
                )

                expect(result).toBe(true)
            }
        )

        it('should return false for wrong OTP', () => {
            const futureDate = new Date(
                Date.now() + 1000 * 60 * 60
            )

            const result = verifyOTP(
                123456,
                futureDate,
                654321
            )

            expect(result).toBe(false)
        })

        it('should return false for expired OTP', () => {
            const pastDate = new Date(
                Date.now() - 1000 * 60 * 60
            )
            const otp = 123456

            const result = verifyOTP(
                otp,
                pastDate,
                otp
            )

            expect(result).toBe(false)
        })

        it(
            'should handle string OTP by converting to number',
            () => {
                const futureDate = new Date(
                    Date.now() + 1000 * 60 * 60
                )
                const otp = 123456

                const result = verifyOTP(
                    otp,
                    futureDate,
                    '123456' as unknown as number
                )

                expect(result).toBe(true)
            }
        )
    })

    // ==================== login ====================
    describe('login', () => {
        it('propagates DB error from getUserByEmail', async () => {
            prismaMock.user.findUnique
                .mockRejectedValue(new Error('DB error'))

            await expect(
                login('test@test.com', 'Password123!')
            ).rejects.toThrow('DB error')
        })

        it(
            'should return token for valid credentials',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const token = await login(
                    'test@test.com',
                    'Password123!'
                )

                expect(token).toBeDefined()
                expect(typeof token).toBe('string')
            }
        )

        it(
            'should throw AuthError for non-existent user',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null)

                await expect(
                    login('notfound@test.com', 'Password123!')
                )
                    .rejects
                    .toThrow('User not found!')
            }
        )

        it(
            'should throw AuthError for wrong password',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                await expect(
                    login('test@test.com', 'WrongPassword')
                )
                    .rejects
                    .toThrow('Invalid password!')
            }
        )

        // ==================== timezone auto-detect ====================
        it(
            'should not update profile timezone when ip is not provided',
            async () => {
                const mockUser = createMockUser({
                    profile: { timezone: 'Asia/Jerusalem' }
                })
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                await login('test@test.com', 'Password123!')

                expect(prismaMock.profile.update)
                    .not.toHaveBeenCalled()
            }
        )

        it(
            'should not update profile timezone when geoip returns null',
            async () => {
                const mockUser = createMockUser({
                    profile: { timezone: 'Asia/Jerusalem' }
                })
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue(null)

                await login('test@test.com', 'Password123!', '1.2.3.4')

                expect(prismaMock.profile.update)
                    .not.toHaveBeenCalled()
            }
        )

        it(
            'should not update profile timezone when detected timezone matches current',
            async () => {
                const mockUser = createMockUser({
                    profile: { timezone: 'America/New_York' }
                })
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue('America/New_York')

                await login('test@test.com', 'Password123!', '1.2.3.4')

                expect(prismaMock.profile.update)
                    .not.toHaveBeenCalled()
            }
        )

        it(
            'should update profile timezone when detected timezone differs from current',
            async () => {
                const mockUser = createMockUser({
                    profile: { timezone: 'Asia/Jerusalem' }
                })
                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)
                prismaMock.profile.update
                    .mockResolvedValue({} as never)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue('America/New_York')

                await login('test@test.com', 'Password123!', '1.2.3.4')

                expect(prismaMock.profile.update)
                    .toHaveBeenCalledWith(
                        expect.objectContaining({
                            where: { userId: mockUser.id },
                            data: { timezone: 'America/New_York' }
                        })
                    )
            }
        )
    })

    // ==================== signup ====================
    describe('signup', () => {
        it(
            'should create user with hashed password',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null)
                prismaMock.user.create
                    .mockResolvedValue(createMockUser())

                const newUser = {
                    firstName: 'John',
                    lastName: 'Doe',
                    username: 'johndoe',
                    email: 'john@test.com',
                    password: 'Password123!'
                }

                const result = await signup(newUser)

                expect(result).toBeDefined()
                expect(prismaMock.user.create)
                    .toHaveBeenCalled()
            }
        )

        it('should throw error for existing email', async () => {
            prismaMock.user.findUnique
                .mockResolvedValue(createMockUser())

            const newUser = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'test@test.com',
                password: 'Password123!'
            }

            await expect(signup(newUser))
                .rejects
                .toThrow('User already exists!')
        })

        it('should throw error for taken username', async () => {
            prismaMock.user.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValue(createMockUser())

            const newUser = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'takenname',
                email: 'new@test.com',
                password: 'Password123!'
            }

            await expect(signup(newUser))
                .rejects
                .toThrow('Username already taken!')
        })

        it('propagates DB error from createUser', async () => {
            prismaMock.user.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
            prismaMock.user.create
                .mockRejectedValue(new Error('DB error'))

            await expect(signup({
                firstName: 'John',
                lastName: 'Doe',
                username: 'newuser',
                email: 'new@test.com',
                password: 'Password123!'
            })).rejects.toThrow('DB error')
        })
    })

    // ==================== getUser ====================
    describe('getUser', () => {
        it('returns user when found by email', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user)

            const result = await getUser('email', user.email)

            expect(result).toEqual(user)
        })

        it('returns user when found by id', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user)

            const result = await getUser('id', user.id)

            expect(result).toEqual(user)
        })

        it('returns null when user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const result = await getUser('email', 'nobody@test.com')

            expect(result).toBeNull()
        })
    })

    // ==================== resetPassword ====================
    describe('resetPassword', () => {
        it('calls updatePassword with hashed password', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user)

            const result = await resetPassword('user-id', 'NewPassword123!')

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'user-id' })
                })
            )
            expect(result).toEqual(user)
        })
    })

    // ==================== updateEmail ====================
    describe('updateEmail', () => {
        it('delegates to authModel.updateEmail', async () => {
            const user = createMockUser({ email: 'new@test.com' })
            prismaMock.user.update.mockResolvedValue(user)

            const result = await updateEmail('user-id', 'new@test.com')

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'user-id' }),
                    data: expect.objectContaining({ email: 'new@test.com' })
                })
            )
            expect(result).toEqual(user)
        })

        it('propagates DB error', async () => {
            prismaMock.user.update
                .mockRejectedValue(new Error('DB error'))

            await expect(
                updateEmail('user-id', 'new@test.com')
            ).rejects.toThrow('DB error')
        })
    })

    // ==================== deactivateUser ====================
    describe('deactivateUser', () => {
        it('throws NotFoundError when user does not exist', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            await expect(
                deactivateUser('nonexistent-id')
            ).rejects.toThrow('User not found')
        })

        it('calls disableUser when user exists', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user)
            prismaMock.user.update.mockResolvedValue({ ...user, active: false })

            await deactivateUser(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id }
                })
            )
        })

        it('propagates DB error from disableUser', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user)
            prismaMock.user.update.mockRejectedValue(new Error('DB error'))

            await expect(
                deactivateUser(user.id)
            ).rejects.toThrow('DB error')
        })
    })
})
