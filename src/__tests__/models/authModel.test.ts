import * as authModel from '../../models/authModel'
import { prismaMock } from '../setup/jestSetup'
import { createMockUser } from '../setup/testSetup'

describe('AuthModel', () => {
    describe('getUserById', () => {
        it('returns user when found and active', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            const result = await authModel.getUserById(user.id)

            expect(result).toEqual(user)
        })

        it('returns null when user is inactive', async () => {
            const user = createMockUser({ active: false })
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            const result = await authModel.getUserById(user.id)

            expect(result).toBeNull()
        })

        it('returns null when user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserById('nonexistent-id')

            expect(result).toBeNull()
        })

        it('queries by id', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            await authModel.getUserById('target-id')

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'target-id' }
                })
            )
        })
    })

    describe('getUserByEmail', () => {
        it('returns user when found and active', async () => {
            const user = createMockUser()
            prismaMock.user.findFirst.mockResolvedValue(user as never)

            const result = await authModel.getUserByEmail(user.email)

            expect(result).toEqual(user)
        })

        it('returns null when user is inactive', async () => {
            const user = createMockUser({ active: false })
            prismaMock.user.findFirst.mockResolvedValue(user as never)

            const result = await authModel.getUserByEmail(user.email)

            expect(result).toBeNull()
        })

        it('queries by email case-insensitively', async () => {
            prismaMock.user.findFirst.mockResolvedValue(createMockUser() as never)

            await authModel.getUserByEmail('someone@test.com')

            expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        email: {
                            equals: 'someone@test.com',
                            mode: 'insensitive'
                        }
                    }
                })
            )
        })
    })

    describe('createUser', () => {
        it('creates user and profile atomically in transaction', async () => {
            const user = createMockUser()
            prismaMock.user.create.mockResolvedValue(user as never)
            prismaMock.profile.create.mockResolvedValue({
                id: 'profile-id',
                userId: user.id
            } as never)

            const result = await authModel.createUser({
                firstName: 'Test',
                lastName: 'User',
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashed-pw'
            })

            expect(prismaMock.user.create).toHaveBeenCalled()
            expect(prismaMock.profile.create).toHaveBeenCalled()
            expect(result).toEqual(user)
        })
    })

    describe('updateUser', () => {
        it('calls update with active: true constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.updateUser(user.id, { firstName: 'Updated' })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: expect.objectContaining({ firstName: 'Updated' })
                })
            )
        })
    })

    describe('updatePassword', () => {
        it('stores hashed password and timestamp', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.updatePassword(user.id, 'new-hashed-pw')

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        password: 'new-hashed-pw'
                    })
                })
            )
        })
    })

    describe('disableUser', () => {
        it('deactivates and starts the deletion countdown without requiring active constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue({ ...user, active: false } as never)

            await authModel.disableUser(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id },
                    data: {
                        active: false,
                        deletedAt: expect.any(Date),
                        deleteAccountOTP: null,
                        deleteAccountExpiration: null,
                        deleteAccountAttempts: 0
                    }
                })
            )
        })
    })


    describe('getUserTimezone', () => {
        it('returns timezone from profile', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ timezone: 'Asia/Jerusalem' } as never)

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBe('Asia/Jerusalem')
        })

        it('returns null when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBeNull()
        })

        it('returns null when profile has no timezone', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ timezone: null } as never)

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBeNull()
        })
    })

    describe('getUserLanguage', () => {
        it('returns language from profile', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ language: 'en' } as never)

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('en')
        })

        it('defaults to he when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('he')
        })

        it('defaults to he when language is null', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ language: null } as never)

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('he')
        })
    })

    describe('getUserByUsername', () => {
        it('returns user when found and active', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            const result = await authModel.getUserByUsername('testuser')

            expect(result).toEqual(user)
        })

        it('returns inactive users, whose usernames stay taken until the purge', async () => {
            const user = createMockUser({ active: false })
            prismaMock.user.findUnique.mockResolvedValue(user as never)

            const result = await authModel.getUserByUsername('testuser')

            expect(result).toEqual(user)
        })

        it('returns null when user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserByUsername('nobody')

            expect(result).toBeNull()
        })

        it('queries by username', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser() as never)

            await authModel.getUserByUsername('targetuser')

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { username: 'targetuser' }
                })
            )
        })
    })

    describe('setUserOTP', () => {
        it('calls update with OTP data and active constraint', async () => {
            const user = createMockUser()
            const expiration = new Date('2026-01-01T12:00:00Z')
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.setUserOTP(user.id, {
                resetPasswordOTP: 123456,
                resetPasswordExpiration: expiration
            })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: expect.objectContaining({
                        resetPasswordOTP: 123456,
                        resetPasswordExpiration: expiration
                    })
                })
            )
        })

        it('can clear OTP with null values', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.setUserOTP(user.id, {
                resetPasswordOTP: null,
                resetPasswordExpiration: null
            })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        resetPasswordOTP: null,
                        resetPasswordExpiration: null
                    })
                })
            )
        })
    })

    describe('incrementResetPasswordAttempts', () => {
        it('increments the attempt counter with active constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.incrementResetPasswordAttempts(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: { resetPasswordAttempts: { increment: 1 } }
                })
            )
        })
    })

    describe('setConfirmEmailOTP', () => {
        it('calls update with confirm-email OTP data and active constraint', async () => {
            const user = createMockUser()
            const expiration = new Date('2026-01-01T12:00:00Z')
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.setConfirmEmailOTP(user.id, {
                confirmEmailOTP: 654321,
                confirmEmailExpiration: expiration
            })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: expect.objectContaining({
                        confirmEmailOTP: 654321,
                        confirmEmailExpiration: expiration
                    })
                })
            )
        })
    })

    describe('incrementConfirmEmailAttempts', () => {
        it('increments the attempt counter with active constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.incrementConfirmEmailAttempts(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: { confirmEmailAttempts: { increment: 1 } }
                })
            )
        })
    })

    describe('setEmailChangeOTP', () => {
        it('calls update with email change data and active constraint', async () => {
            const user = createMockUser()
            const expiration = new Date('2026-01-01T12:00:00Z')
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.setEmailChangeOTP(user.id, {
                pendingEmail: 'new@test.com',
                emailChangeOTP: 654321,
                emailChangeExpiration: expiration,
                emailChangeAttempts: 0
            })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: expect.objectContaining({
                        pendingEmail: 'new@test.com',
                        emailChangeOTP: 654321,
                        emailChangeExpiration: expiration
                    })
                })
            )
        })

        it('can clear pending email with null values', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.setEmailChangeOTP(user.id, {
                pendingEmail: null,
                emailChangeOTP: null,
                emailChangeExpiration: null,
                emailChangeAttempts: 0
            })

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        pendingEmail: null,
                        emailChangeOTP: null,
                        emailChangeExpiration: null
                    })
                })
            )
        })
    })

    describe('updateEmail', () => {
        it('sets new email and clears all OTP fields', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.updateEmail(user.id, 'new@test.com')

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: expect.objectContaining({
                        email: 'new@test.com',
                        pendingEmail: null,
                        emailChangeOTP: null,
                        emailChangeExpiration: null
                    })
                })
            )
        })
    })

    describe('linkGoogleId', () => {
        it('calls update with googleId and active constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue(user as never)

            await authModel.linkGoogleId(user.id, 'google-oauth-id-123')

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id, active: true },
                    data: { googleId: 'google-oauth-id-123' }
                })
            )
        })
    })

    describe('Prisma error propagation', () => {
        it('getUserById propagates Prisma connection error', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Connection refused'))

            await expect(authModel.getUserById('any-id')).rejects.toThrow('Connection refused')
        })

        it('createUser propagates error when profile creation fails mid-transaction', async () => {
            prismaMock.user.create.mockResolvedValue(createMockUser() as never)
            prismaMock.profile.create.mockRejectedValue(new Error('Profile creation failed'))

            await expect(
                authModel.createUser({
                    firstName: 'Test',
                    lastName: 'User',
                    username: 'testuser',
                    email: 'test@test.com',
                    password: 'hashed-pw'
                })
            ).rejects.toThrow('Profile creation failed')
        })

        it('updateUser propagates Prisma error for non-existent user', async () => {
            prismaMock.user.update.mockRejectedValue(new Error('P2025'))

            await expect(
                authModel.updateUser('non-existent', { firstName: 'X' })
            ).rejects.toThrow('P2025')
        })
    })
})
