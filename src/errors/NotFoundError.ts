import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

class NotFoundError extends CustomError {
    statusCode = HttpStatusCodes.NOT_FOUND

    statusType = 'Not Found'

    constructor(
        message: string,
        private property?: string,
        statusType?: string,
        statusCode?: number
    ) {
        super(message)
        this.statusType = statusType ?? this.statusType
        this.statusCode = statusCode ?? this.statusCode

        Object.setPrototypeOf(this, NotFoundError.prototype)
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

export { NotFoundError }
