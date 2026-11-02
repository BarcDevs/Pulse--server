import jwt from 'jsonwebtoken'

import { Prisma } from '../../../prisma/generated/prisma/client'
import { GUEST_PASSWORD_HASH } from '../../constants/auth/authRules'
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
import { getSessionState } from '../../models/sessionModel'
import {
    createGuest,
    deactivateUser,
    getUser,
    login,
    resetPassword,
    resolveGuest,
    signup,
    updateEmail,
    upgradeGuest
} from '../../services/authService'
import { prismaMock } from '../setup/jestSetup'
import { createMockUser } from '../setup/testSetup'

jest.mock('../../lib/geoLocation')

describe('Auth Service', () => {
    // ==================== hashPassword ====================
    describe('hashPassword', () => {
        it('should return a hashed string', async () => {
            const password = 'TestPassword123!'
            const hashed = await hashPassword(password)

            expect(hashed).toBeDefined()
            expect(typeof hashed).toBe('string')
            expect(hashed).not.toBe(password)
            expect(hashed.length).toBeGreaterThan(0)
        })

        it(
            'should return different hashes for same password',
            async () => {
                const password = 'TestPassword123!'
                const hash1 = await hashPassword(password)
                const hash2 = await hashPassword(password)

                expect(hash1).not.toBe(hash2)
            }
        )
    })

    // ==================== comparePassword ====================
    describe('comparePassword', () => {
        it(
            'should return true for valid password match',
            async () => {
                const password = 'TestPassword123!'
                const hashed = await hashPassword(password)

                const result = await comparePassword(
                    password,
                    hashed
                )

                expect(result).toBe(true)
            }
        )

        it(
            'should return false for invalid password match',
            async () => {
                const password = 'TestPassword123!'
                const wrongPassword = 'WrongPassword456'
                const hashed = await hashPassword(password)

                const result = await comparePassword(
                    wrongPassword,
                    hashed
                )

                expect(result).toBe(false)
            }
        )

        it('should return false for empty password', async () => {
            const password = 'TestPassword123!'
            const hashed = await hashPassword(password)

            const result = await comparePassword('', hashed)

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
            'should include only the user id in token payload',
            () => {
                const mockUser = createMockUser()

                const token = createToken(mockUser)
                const decoded = jwt.decode(token) as {
                    id: string
                    email?: string
                }

                expect(decoded.id).toBe(mockUser.id)
                expect(decoded.email).toBeUndefined()
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

        it('should use SameSite=Lax outside dev too', () => {
            const options = getCookiesOptions(false)

            expect(options.sameSite).toBe('lax')
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

        it(
            'should remove email-change and internal account fields from user data',
            () => {
                const mockUser = createMockUser({
                    pendingEmail: 'new@example.com',
                    emailChangeOTP: 123456,
                    emailChangeExpiration: new Date(),
                    googleId: 'google-sub-id',
                    active: true
                })

                const sanitized = sanitizeUserData(mockUser)

                expect(sanitized).not.toHaveProperty('pendingEmail')
                expect(sanitized).not.toHaveProperty('emailChangeOTP')
                expect(sanitized)
                    .not.toHaveProperty('emailChangeExpiration')
                expect(sanitized).not.toHaveProperty('googleId')
                expect(sanitized).not.toHaveProperty('active')
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
        it('restores an account pending deletion', async () => {
            const mockUser = createMockUser({
                active: false,
                deletedAt: new Date()
            })
            prismaMock.user.findFirst
                .mockResolvedValue(mockUser as never)

            await login('test@test.com', 'Password123!', false)

            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: {
                    active: true,
                    deletedAt: null,
                    passwordUpdatedAt: expect.any(Date)
                }
            })
        })

        it('does not restore a pending-deletion account on a wrong password', async () => {
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser({
                    active: false,
                    deletedAt: new Date()
                }) as never)

            await expect(
                login('test@test.com', 'WrongPassword1', false)
            ).rejects.toThrow()
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('does not touch an active account', async () => {
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser() as never)

            await login('test@test.com', 'Password123!', false)

            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('propagates DB error from getUserByEmail', async () => {
            prismaMock.user.findFirst
                .mockRejectedValue(new Error('DB error'))

            await expect(
                login('test@test.com', 'Password123!', false)
            ).rejects.toThrow('DB error')
        })

        it(
            'should return token for valid credentials',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)

                const token = await login(
                    'test@test.com',
                    'Password123!',
                    false
                )

                expect(token).toBeDefined()
                expect(typeof token).toBe('string')
            }
        )

        it(
            'should throw AuthError for non-existent user',
            async () => {
                prismaMock.user.findFirst
                    .mockResolvedValue(null as never)

                await expect(
                    login('notfound@test.com', 'Password123!', false)
                )
                    .rejects
                    .toThrow('Invalid credentials! please try again!')
            }
        )

        it(
            'should throw AuthError for wrong password',
            async () => {
                const mockUser = createMockUser()
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)

                await expect(
                    login('test@test.com', 'WrongPassword', false)
                )
                    .rejects
                    .toThrow('Invalid credentials! please try again!')
            }
        )

        // ==================== timezone auto-detect ====================
        it(
            'should not update profile timezone when ip is not provided',
            async () => {
                const mockUser = createMockUser({
                    profile: { timezone: 'Asia/Jerusalem' }
                })
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)

                await login('test@test.com', 'Password123!', false)

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
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue(null as never)

                await login('test@test.com', 'Password123!', false, '1.2.3.4')

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
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue('America/New_York')

                await login('test@test.com', 'Password123!', false, '1.2.3.4')

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
                prismaMock.user.findFirst
                    .mockResolvedValue(mockUser as never)
                prismaMock.profile.update
                    .mockResolvedValue({} as never)
                jest.mocked(getTimezoneFromIp)
                    .mockReturnValue('America/New_York')

                await login('test@test.com', 'Password123!', false, '1.2.3.4')

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
        it('rejects an email held by an account pending deletion', async () => {
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser({
                    active: false,
                    deletedAt: new Date()
                }) as never)

            await expect(signup({
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'test@test.com',
                password: 'Password123!'
            })).rejects.toThrow('User already exists!')
            expect(prismaMock.user.create).not.toHaveBeenCalled()
        })

        it(
            'should create user with hashed password',
            async () => {
                prismaMock.user.findUnique
                    .mockResolvedValue(null as never)
                prismaMock.user.create
                    .mockResolvedValue(createMockUser() as never)

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
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser() as never)

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
                .mockResolvedValue(createMockUser() as never)

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
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(null as never)
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
            prismaMock.user.findFirst.mockResolvedValue(user as never)

            const result = await getUser('email', user.email)

            expect(result).toEqual(user)
        })

        it('returns user when found by id', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            const result = await getUser('id', user.id)

            expect(result).toEqual(user)
        })

        it('returns null when user not found', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)

            const result = await getUser('email', 'nobody@test.com')

            expect(result).toBeNull()
        })
    })

    // ==================== resetPassword ====================
    describe('resetPassword', () => {
        it('calls updatePassword with hashed password', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

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
            prismaMock.user.update.mockResolvedValue(user as never)

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
            prismaMock.user.findUnique.mockResolvedValue(null as never)

            await expect(
                deactivateUser('nonexistent-id')
            ).rejects.toThrow('User not found')
        })

        it('calls disableUser when user exists', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)
            prismaMock.user.update.mockResolvedValue({ ...user, active: false } as never)

            await deactivateUser(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id }
                })
            )
        })

        it('propagates DB error from disableUser', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)
            prismaMock.user.update.mockRejectedValue(new Error('DB error'))

            await expect(
                deactivateUser(user.id)
            ).rejects.toThrow('DB error')
        })
    })
    // ==================== guests ====================
    describe('createGuest', () => {
        const stubCreatedGuest = () => {
            const guest = createMockUser({ isGuest: true })
            prismaMock.user.create.mockResolvedValue(guest as never)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            return guest
        }

        it('creates a flagged guest with placeholder identity and the unusable password hash', async () => {
            stubCreatedGuest()

            await createGuest()

            const { data } = prismaMock.user.create.mock.calls[0][0]

            expect(data).toMatchObject({
                firstName: 'Guest',
                lastName: 'Guest',
                isGuest: true,
                password: GUEST_PASSWORD_HASH
            })
            expect(data.email).toMatch(/^[0-9a-f]{32}@guest\.invalid$/)
            expect(data.username).toMatch(/^guest_[0-9a-f]{12}$/)
        })

        it('gives every guest a distinct email and username', async () => {
            stubCreatedGuest()

            await createGuest()
            await createGuest()

            const [first, second] = prismaMock.user.create.mock.calls
                .map(([args]) => args.data)

            expect(first.email).not.toBe(second.email)
            expect(first.username).not.toBe(second.username)
        })

        it('creates the profile with the timezone from the IP, because a guest never logs in', async () => {
            const guest = stubCreatedGuest()
            jest.mocked(getTimezoneFromIp).mockReturnValue('America/New_York')

            await createGuest('8.8.8.8')

            expect(prismaMock.profile.create).toHaveBeenCalledWith({
                data: {
                    userId: guest.id,
                    timezone: 'America/New_York'
                }
            })
            expect(prismaMock.profile.update).not.toHaveBeenCalled()
        })

        it('leaves the default timezone when there is no IP', async () => {
            const guest = stubCreatedGuest()

            await createGuest()

            expect(prismaMock.profile.create).toHaveBeenCalledWith({
                data: { userId: guest.id }
            })
        })

        it('leaves the default timezone when the IP cannot be located', async () => {
            const guest = stubCreatedGuest()
            jest.mocked(getTimezoneFromIp).mockReturnValue(null)

            await createGuest('10.0.0.1')

            expect(prismaMock.profile.create).toHaveBeenCalledWith({
                data: { userId: guest.id }
            })
        })

        it('returns the user with its profile, as /auth/me does', async () => {
            const guest = stubCreatedGuest()

            await createGuest()

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: guest.id },
                    include: expect.objectContaining({
                        profile: expect.any(Object)
                    })
                })
            )
        })
    })

    describe('resolveGuest', () => {
        const sessionFor = (isGuest: boolean) => {
            const user = createMockUser({ isGuest })
            jest.mocked(getSessionState).mockResolvedValue({
                active: true,
                isGuest,
                passwordUpdatedAt: new Date(0)
            })
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            return { user, token: createToken(user) }
        }

        it('creates a guest when there is no session', async () => {
            const guest = createMockUser({ isGuest: true })
            prismaMock.user.create.mockResolvedValue(guest as never)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const result = await resolveGuest(undefined)

            expect(result.created).toBe(true)
            expect(prismaMock.user.create).toHaveBeenCalled()
        })

        it('creates a guest when the cookie is invalid', async () => {
            const guest = createMockUser({ isGuest: true })
            prismaMock.user.create.mockResolvedValue(guest as never)
            prismaMock.user.findUnique.mockResolvedValue(guest as never)

            const result = await resolveGuest('not-a-token')

            expect(result.created).toBe(true)
        })

        it('reuses the guest behind a valid guest session', async () => {
            const { user, token } = sessionFor(true)

            const result = await resolveGuest(token)

            expect(result).toEqual({ user, created: false })
            expect(prismaMock.user.create).not.toHaveBeenCalled()
        })

        it('refuses to replace a real account session', async () => {
            const { token } = sessionFor(false)

            await expect(resolveGuest(token))
                .rejects.toThrow('Already signed in!')
            expect(prismaMock.user.create).not.toHaveBeenCalled()
        })
    })

    describe('upgradeGuest', () => {
        const upgrade = {
            email: 'new@test.com',
            password: 'Password123!'
        }

        const prismaError = (code: string, target?: string[]) =>
            new Prisma.PrismaClientKnownRequestError('boom', {
                code,
                clientVersion: 'test',
                meta: target ? { target } : undefined
            })

        it('rejects an email that is already taken', async () => {
            prismaMock.user.findFirst
                .mockResolvedValue(createMockUser() as never)

            await expect(upgradeGuest('guest-id', upgrade))
                .rejects.toThrow('User already exists!')
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('rejects a username that is already taken', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.findUnique
                .mockResolvedValue(createMockUser() as never)

            await expect(upgradeGuest('guest-id', {
                ...upgrade,
                username: 'taken'
            })).rejects.toThrow('Username already taken!')
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })

        it('converts the same row, hashes the password and revokes old tokens', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update
                .mockResolvedValue(createMockUser({ isGuest: false }) as never)

            await upgradeGuest('guest-id', upgrade)

            const args = prismaMock.user.update.mock.calls[0][0]

            expect(args.where).toEqual({
                id: 'guest-id',
                active: true,
                isGuest: true
            })
            expect(args.data.isGuest).toBe(false)
            expect(args.data.email).toBe('new@test.com')
            expect(args.data.password).not.toBe(upgrade.password)
            expect(args.data.passwordUpdatedAt).toBeInstanceOf(Date)
        })

        it('gives the real account a generated username when none is sent', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update
                .mockResolvedValue(createMockUser({ isGuest: false }) as never)

            await upgradeGuest('guest-id', upgrade)

            expect(prismaMock.user.update.mock.calls[0][0].data.username)
                .toMatch(/^user\d+$/)
        })

        it('keeps the username the user chose', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.findUnique.mockResolvedValue(null as never)
            prismaMock.user.update
                .mockResolvedValue(createMockUser({ isGuest: false }) as never)

            await upgradeGuest('guest-id', {
                ...upgrade,
                username: 'chosen_name'
            })

            expect(prismaMock.user.update.mock.calls[0][0].data.username)
                .toBe('chosen_name')
        })

        it('maps a lost race on the email to a 409, found by re-reading the email', async () => {
            prismaMock.user.findFirst
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(createMockUser() as never)
            prismaMock.user.update.mockRejectedValue(prismaError('P2002'))

            await expect(upgradeGuest('guest-id', upgrade))
                .rejects.toThrow('User already exists!')
        })

        it('maps a lost race on the username to a 409, whatever shape the error meta has', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update.mockRejectedValue(prismaError('P2002'))

            await expect(upgradeGuest('guest-id', upgrade))
                .rejects.toThrow('Username already taken!')
        })

        it('maps a double submit (guest row already converted) to a 403', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update.mockRejectedValue(prismaError('P2025'))

            await expect(upgradeGuest('guest-id', upgrade))
                .rejects.toThrow('Only guest accounts can be upgraded')
        })

        it('lets an unexpected database error through', async () => {
            prismaMock.user.findFirst.mockResolvedValue(null as never)
            prismaMock.user.update.mockRejectedValue(new Error('db down'))

            await expect(upgradeGuest('guest-id', upgrade))
                .rejects.toThrow('db down')
        })
    })

    describe('login as a guest', () => {
        it('refuses a guest row even when the password matches', async () => {
            const guest = createMockUser({
                isGuest: true,
                password: await hashPassword('Guessable-Pass-1!')
            })
            prismaMock.user.findFirst.mockResolvedValue(guest as never)

            await expect(login(guest.email, 'Guessable-Pass-1!', false))
                .rejects.toThrow()
            expect(prismaMock.user.update).not.toHaveBeenCalled()
        })
    })
})
