// @ts-nocheck
import * as profileModel from '../../models/profileModel'
import { prismaMock } from '../setup/jestSetup'

const mockProfile = {
    id: 'profile-id',
    userId: 'user-id',
    bio: null,
    image: null,
    location: null,
    timezone: null
}

describe('ProfileModel', () => {
    describe('getProfileByUserId', () => {
        it('returns profile when found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(mockProfile)

            const result = await profileModel.getProfileByUserId('user-id')

            expect(result).toEqual(mockProfile)
            expect(prismaMock.profile.findUnique).toHaveBeenCalledWith({
                where: { userId: 'user-id' }
            })
        })

        it('returns null when not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            const result = await profileModel.getProfileByUserId('user-id')

            expect(result).toBeNull()
        })
    })

    describe('updateProfile', () => {
        it('calls profile.update with userId and provided data', async () => {
            const updated = { ...mockProfile, bio: 'new bio' }
            prismaMock.profile.update.mockResolvedValue(updated)

            const result = await profileModel.updateProfile('user-id', {
                bio: 'new bio'
            })

            expect(prismaMock.profile.update).toHaveBeenCalledWith({
                where: { userId: 'user-id' },
                data: { bio: 'new bio' }
            })
            expect(result).toEqual(updated)
        })
    })

    describe('getAvailableHealthInterests', () => {
        it('returns non-empty array', () => {
            const result = profileModel.getAvailableHealthInterests()

            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBeGreaterThan(0)
        })

        it('returns strings', () => {
            const result = profileModel.getAvailableHealthInterests()

            result.forEach((item) =>
                expect(typeof item).toBe('string')
            )
        })
    })

    describe('getAvailableActivityPreferences', () => {
        it('returns non-empty array', () => {
            const result = profileModel.getAvailableActivityPreferences()

            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBeGreaterThan(0)
        })

        it('returns strings', () => {
            const result = profileModel.getAvailableActivityPreferences()

            result.forEach((item) =>
                expect(typeof item).toBe('string')
            )
        })
    })
})
