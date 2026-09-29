import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class NotFoundError extends CustomError {
    statusCode = HttpStatusCodes.NOT_FOUND

    statusType = 'Not Found'

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

        Object.setPrototypeOf(this, NotFoundError.prototype)
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