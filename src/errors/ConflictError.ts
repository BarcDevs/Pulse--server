import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class ConflictError extends CustomError {
    statusCode = HttpStatusCodes.CONFLICT

    statusType = 'Conflict'

    code: string

    constructor(
        message: string,
        code: string,
        private property?: string,
        params?: Record<string, string>
    ) {
        super(message, params)
        this.code = code

        Object.setPrototypeOf(
            this,
            ConflictError.prototype
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