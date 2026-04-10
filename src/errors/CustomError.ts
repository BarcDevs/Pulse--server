import type { ICustomError } from '../interfaces/ICustomError'

export abstract class CustomError extends Error implements ICustomError {
    abstract statusCode: number

    abstract statusType: string

    protected constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, CustomError.prototype)
    }

    abstract serializeErrors(): {
        statusType: string
        statusCode?: number
        error: string
        field?: string
    }[]
}
