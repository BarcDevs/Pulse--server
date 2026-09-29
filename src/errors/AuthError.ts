import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class AuthError extends CustomError {
    statusCode = HttpStatusCodes.UNAUTHORIZED

    statusType = 'Authentication Error'

    code: string

    constructor(
        message: string,
        code: string,
        private property?: string,
        statusType?: string,
        statusCode?: number,
        params?: Record<string, string>
    ) {
        super(message, params)
        this.code = code
        this.statusType = statusType ?? this.statusType
        this.statusCode = statusCode ?? this.statusCode

        Object.setPrototypeOf(this, AuthError.prototype)
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