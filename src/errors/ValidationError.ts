import type { ZodError } from 'zod'

import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { errorFactory } from './factory/ErrorFactory'
import { CustomError } from './CustomError'

export class ValidationError extends CustomError {
    statusCode = HttpStatusCodes.FORBIDDEN

    statusType = 'Validation Error'

    constructor(
        message: string,
        private property?: string
    ) {
        super(message)

        Object.setPrototypeOf(this, ValidationError.prototype)
    }

    static catchValidationErrors = <T,>(
        result: {
            success?: boolean
            data?: T
            error?: ZodError
        }
    ): T => {
        if (result.success) return result.data as T
        const issue = result.error!.issues[0]
        const errorProperty = String(issue.path[0]) || 'unknown'

        throw errorFactory.validation.generic(
            issue.message,
            errorProperty
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