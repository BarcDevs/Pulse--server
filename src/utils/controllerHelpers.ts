import type { Request } from 'express'
import type { ZodSchema } from 'zod'

import { errorFactory } from '../errors/factory/ErrorFactory'
import { ValidationError } from '../errors/ValidationError'

export const extractUserId = (req: Request): string => {
    const { userId } = req

    if (!userId)
        throw errorFactory.auth.unauthorized()

    return userId
}

export const validateAndExtract = <T,>(
    schema: ZodSchema,
    data: unknown
): T =>
    ValidationError.catchValidationErrors(
        schema.safeParse(data)
    ) as T