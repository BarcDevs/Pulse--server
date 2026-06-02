import { errorFactory } from '../errors/factory/ErrorFactory'
import * as profileModel from '../models/profileModel'

export const ensureProfileExists = async (
    userId: string
) => {
    const profile = await profileModel
        .getProfileByUserId(userId)

    if (!profile) {
        throw errorFactory.generic.notFound('Profile')
    }

    return profile
}
