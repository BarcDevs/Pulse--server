// @ts-nocheck
import * as authModel from '../../models/authModel'
import { prismaMock } from '../setup/jestSetup'
import { createMockUser } from '../setup/testSetup'

describe('AuthModel', () => {
    describe('getUserById', () => {
        it('returns user when found and active', async () => {
            const user = createMockUser()
            prismaMock.user.findUnique.mockResolvedValue(user)

            const result = await authModel.getUserById(user.id)

            expect(result).toEqual(user)
        })

        it('returns null when user is inactive', async () => {
            const user = createMockUser({ active: false })
            prismaMock.user.findUnique.mockResolvedValue(user)

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
            prismaMock.user.findUnique.mockResolvedValue(user)

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
            prismaMock.user.findUnique.mockResolvedValue(user)

            const result = await authModel.getUserByEmail(user.email)

            expect(result).toEqual(user)
        })

        it('returns null when user is inactive', async () => {
            const user = createMockUser({ active: false })
            prismaMock.user.findUnique.mockResolvedValue(user)

            const result = await authModel.getUserByEmail(user.email)

            expect(result).toBeNull()
        })

        it('queries by email', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser())

            await authModel.getUserByEmail('someone@test.com')

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { email: 'someone@test.com' }
                })
            )
        })
    })

    describe('createUser', () => {
        it('creates user and profile atomically in transaction', async () => {
            const user = createMockUser()
            prismaMock.user.create.mockResolvedValue(user)
            prismaMock.profile.create.mockResolvedValue({
                id: 'profile-id',
                userId: user.id
            })

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
            prismaMock.user.update.mockResolvedValue(user)

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
            prismaMock.user.update.mockResolvedValue(user)

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
        it('sets active to false without requiring active constraint', async () => {
            const user = createMockUser()
            prismaMock.user.update.mockResolvedValue({ ...user, active: false })

            await authModel.disableUser(user.id)

            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: user.id },
                    data: { active: false }
                })
            )
        })
    })

    describe('deleteUser', () => {
        it('deletes by id', async () => {
            const user = createMockUser()
            prismaMock.user.delete.mockResolvedValue(user)

            await authModel.deleteUser(user.id)

            expect(prismaMock.user.delete).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: user.id } })
            )
        })
    })

    describe('getUserTimezone', () => {
        it('returns timezone from profile', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ timezone: 'Asia/Jerusalem' })

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBe('Asia/Jerusalem')
        })

        it('returns null when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBeNull()
        })

        it('returns null when profile has no timezone', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ timezone: null })

            const result = await authModel.getUserTimezone('user-id')

            expect(result).toBeNull()
        })
    })

    describe('getUserLanguage', () => {
        it('returns language from profile', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ language: 'en' })

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('en')
        })

        it('defaults to he when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('he')
        })

        it('defaults to he when language is null', async () => {
            prismaMock.profile.findUnique.mockResolvedValue({ language: null })

            const result = await authModel.getUserLanguage('user-id')

            expect(result).toBe('he')
        })
    })
})
