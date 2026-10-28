import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class TooManyRequestsError extends CustomError {
    statusCode = HttpStatusCodes.TOO_MANY_REQUESTS

    statusType = 'Too Many Requests'

    code: string

    constructor(
        message: string,
        code: string,
        params?: Record<string, string>
    ) {
        super(message, params)
        this.code = code

        Object.setPrototypeOf(
            this,
            TooManyRequestsError.prototype
        )
    }

    serializeErrors() {
        return [
            {
                statusType: this.statusType,
                statusCode: this.statusCode,
                code: this.code,
                params: this.params,
                error: this.message
            }
        ]
    }
}
