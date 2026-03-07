import type {Request, Response} from 'express'

import {errorFactory} from '../errors/factory'
import {
    ValidationError
} from '../errors/ValidationError'
import {successResponse} from '../responses/success'
import {
    addActivityPreferencesSchema,
    addHealthInterestsSchema,
    slugParamSchema,
    updateProfileSchema
} from '../schemas/profileSchema'
import * as profileService from
        '../services/profileService'

export const getProfile = async (
    req: Request,
    res: Response
) => {
    const {userId} = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const profile =
        await profileService.getProfile(
            userId
        )

    return successResponse(
        res,
        profile,
        'Profile retrieved successfully'
    )
}

export const updateProfile = async (
    req: Request,
    res: Response
) => {
    const {userId} = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData =
        ValidationError.catchValidationErrors(
            updateProfileSchema.validate(
                req.body
            )
        )

    const profile =
        await profileService.updateProfile(
            userId,
            validatedData
        )

    return successResponse(
        res,
        profile,
        'Profile updated successfully'
    )
}

export const addHealthInterests = async (
    req: Request,
    res: Response
) => {
    const {userId} = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData =
        ValidationError.catchValidationErrors(
            addHealthInterestsSchema.validate(
                req.body
            )
        )

    await profileService.addHealthInterests(
        userId,
        validatedData.slugs
    )

    const profile =
        await profileService.getProfile(
            userId
        )

    return successResponse(
        res,
        profile,
        'Health interests added successfully'
    )
}

export const removeHealthInterest = async (
    req: Request,
    res: Response
) => {
    const {userId} = req
    const {slug} = req.params

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedParams =
        ValidationError.catchValidationErrors(
            slugParamSchema.validate({slug})
        )

    await profileService.removeHealthInterest(
        userId,
        validatedParams.slug
    )

    const profile =
        await profileService.getProfile(
            userId
        )

    return successResponse(
        res,
        profile,
        'Health interest removed successfully'
    )
}

export const addActivityPreferences = async (
    req: Request,
    res: Response
) => {
    const {userId} = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedData =
        ValidationError.catchValidationErrors(
            addActivityPreferencesSchema.validate(
                req.body
            )
        )

    await profileService
        .addActivityPreferences(
            userId,
            validatedData.slugs
        )

    const profile = await profileService.getProfile(
        userId
    )

    return successResponse(
        res,
        profile,
        'Activity preferences added successfully'
    )
}

export const removeActivityPreference = async (
    req: Request,
    res: Response
) => {
    const {userId} = req
    const {slug} = req.params

    if (!userId)
        throw errorFactory.auth.unauthorized()

    const validatedParams =
        ValidationError.catchValidationErrors(
            slugParamSchema.validate({slug})
        )

    await profileService
        .removeActivityPreference(
            userId,
            validatedParams.slug
        )

    const profile =
        await profileService.getProfile(
            userId
        )

    return successResponse(
        res,
        profile,
        'Activity preference removed successfully'
    )
}

export const getHealthInterests = async (
    req: Request,
    res: Response
) => {
    const interests =
        await profileService
            .getAvailableHealthInterests()

    return successResponse(
        res,
        interests,
        `${interests.length} health interests available`
    )
}

export const getActivityPreferences = async (
    req: Request,
    res: Response
) => {
    const activities =
        await profileService
            .getAvailableActivityPreferences()

    return successResponse(
        res,
        activities,
        `${activities.length} activity preferences available`
    )
}