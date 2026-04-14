import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class AuthError extends CustomError {
    statusCode = HttpStatusCodes.UNAUTHORIZED

    statusType = 'Authentication Error'

    constructor(
        message: string,
        private property?: string,
        statusType?: string,
        statusCode?: number
    ) {
        super(message)
        this.statusType = statusType ?? this.statusType
        this.statusCode = statusCode ?? this.statusCode

        Object.setPrototypeOf(this, AuthError.prototype)
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