import { PROFILE_CONTEXT_TTL_MS } from '../../constants/profileContextCache'
import * as profileModel from '../../models/profileModel'
import { prismaMock } from '../setup/jestSetup'

describe('profile context cache', () => {
    const profile = {
        id: 'profile-id',
        timezone: 'Asia/Jerusalem'
    }

    it('reads the database once for repeated lookups', async () => {
        prismaMock.profile.findUnique.mockResolvedValue(profile as never)

        await profileModel.findProfileContext('user-id')
        const second = await profileModel.findProfileContext('user-id')

        expect(second).toEqual(profile)
        expect(prismaMock.profile.findUnique).toHaveBeenCalledTimes(1)
    })

    it('does not cache a missing profile', async () => {
        prismaMock.profile.findUnique.mockResolvedValue(null)

        await profileModel.findProfileContext('user-id')
        await profileModel.findProfileContext('user-id')

        expect(prismaMock.profile.findUnique).toHaveBeenCalledTimes(2)
    })

    it('reads again after the TTL passes', async () => {
        prismaMock.profile.findUnique.mockResolvedValue(profile as never)
        const now = Date.now()
        const spy = jest.spyOn(Date, 'now')
        spy.mockReturnValue(now)

        await profileModel.findProfileContext('user-id')
        spy.mockReturnValue(now + PROFILE_CONTEXT_TTL_MS + 1)
        await profileModel.findProfileContext('user-id')
        spy.mockRestore()

        expect(prismaMock.profile.findUnique).toHaveBeenCalledTimes(2)
    })

    it('reads again after the profile is updated', async () => {
        prismaMock.profile.findUnique.mockResolvedValue(profile as never)
        prismaMock.profile.update.mockResolvedValue(profile as never)

        await profileModel.findProfileContext('user-id')
        await profileModel.updateProfile('user-id', { timezone: 'UTC' })
        await profileModel.findProfileContext('user-id')

        expect(prismaMock.profile.findUnique).toHaveBeenCalledTimes(2)
    })
})
