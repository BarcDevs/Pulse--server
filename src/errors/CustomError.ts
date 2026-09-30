import type { ICustomError } from '../interfaces/ICustomError'

export abstract class CustomError extends Error implements ICustomError {
    abstract statusCode: number

    abstract statusType: string

    abstract code: string

    protected constructor(
        message: string,
        protected params?: Record<string, string>
    ) {
        super(message)

        this.name = new.target.name
        Object.setPrototypeOf(this, CustomError.prototype)
    }

    abstract serializeErrors(): {
        statusType: string
        statusCode?: number
        code: string
        params?: Record<string, string>
        error: string
        field?: string
    }[]
}
