import type {
    NextFunction,
    Request,
    Response
} from 'express'

import {HttpStatusCodes} from '../constants/httpStatusCodes'
import {CustomError} from '../errors/CustomError'
import type {ResponseType} from '../types/ResponseType'

const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof CustomError) {
        const errorType = err.serializeErrors()
        const response: ResponseType<typeof errorType> = {
            message: err.message,
            error: errorType
        }
        return res.status(err.statusCode).json(response)
    }

    type ErrorType = typeof err.message
    const response: ResponseType<ErrorType> = {
        message: 'There was an error',
        error: err.message
    }

    return res
        .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json(response)
}

export {errorHandler}
