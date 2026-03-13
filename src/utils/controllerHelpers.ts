import type {Request} from 'express'
import type {ValidationResult} from 'joi'

import {errorFactory} from '../errors/factory'
import {ValidationError} from '../errors/ValidationError'

const extractUserId = (req: Request): string => {
    const {userId} = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    return userId
}

const validateAndExtract = <T>(
    schema: {
        validate: (
            data: unknown
        ) => ValidationResult<T>
    },
    data: unknown
): T =>
    ValidationError.catchValidationErrors(
        schema.validate(data)
    )

export {
    extractUserId,
    validateAndExtract
}