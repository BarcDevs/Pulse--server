// @ts-nocheck
import { ensureProfileExists } from '../../lib/profileHelpers'
import * as profileModel from '../../models/profileModel'

jest.mock('../../models/profileModel')
jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        generic: {
            notFound: jest.fn((name) => new Error(`${name} not found`))
        }
    }
}))

describe('ensureProfileExists', () => {
    it('returns profile when found', async () => {
        const mockProfile = { id: 'profile-id', userId: 'user-id' }
        ;(profileModel.getProfileByUserId as jest.Mock).mockResolvedValue(mockProfile)

        const result = await ensureProfileExists('user-id')

        expect(result).toEqual(mockProfile)
        expect(profileModel.getProfileByUserId).toHaveBeenCalledWith('user-id')
    })

    it('throws when profile not found', async () => {
        ;(profileModel.getProfileByUserId as jest.Mock).mockResolvedValue(null)

        await expect(ensureProfileExists('user-id')).rejects.toThrow()
    })
})
