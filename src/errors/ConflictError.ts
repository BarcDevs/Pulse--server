import { HttpStatusCodes } from '../constants/httpStatusCodes'

import { CustomError } from './CustomError'

export class ConflictError extends CustomError {
    statusCode = HttpStatusCodes.CONFLICT

    statusType = 'Conflict'

    constructor(
        message: string,
        private property?: string
    ) {
        super(message)

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
                error: this.message,
                property: this.property
            }
        ]
    }
}