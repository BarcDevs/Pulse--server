import type { ZodError } from 'zod'

import { ErrorCodes } from '../constants/errorCodes'
import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class ValidationError extends CustomError {
    statusCode = HttpStatusCodes.BAD_REQUEST

    statusType = 'Validation Error'

    code: string

    constructor(
        message: string,
        code: string,
        private property?: string,
        params?: Record<string, string>
    ) {
        super(message, params)
        this.code = code

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

        throw new ValidationError(
            issue.message,
            ErrorCodes.VALIDATION_ZOD,
            errorProperty,
            { property: errorProperty }
        )
    }

    serializeErrors() {
        return [
            {
                statusType: this.statusType,
                statusCode: this.statusCode,
                code: this.code,
                params: this.params,
                error: this.message,
                property: this.property
            }
        ]
    }
}