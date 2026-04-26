import type { ValidationResult } from 'joi'

import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { errorFactory } from './factory/ErrorFactory'
import { CustomError } from './CustomError'

export class ValidationError extends CustomError {
    statusCode = HttpStatusCodes.BAD_REQUEST

    statusType = 'Validation Error'

    constructor(
        message: string,
        private property?: string
    ) {
        super(message)

        Object.setPrototypeOf(this, ValidationError.prototype)
    }

    static catchValidationErrors = <T>(
        validatedRes: ValidationResult<T>
    ): T => {
        if (!validatedRes.error) return validatedRes.value as T
        const errorMessage = validatedRes.error!.message
        const errorProperty = validatedRes.error!.details[0].path[0]

        throw errorFactory.validation.generic(
            errorMessage,
            errorProperty as string
        )
    }

    serializeErrors() {
        return [
            {
                statusType: this.statusType,
                statusCode: this.statusCode,
                error: this.message,
                property: this.property
            }
        ]
    }
}