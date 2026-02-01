import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { CustomError } from '../errors/CustomError'
import type { ResponseType } from '../types/ResponseType'

const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof CustomError) {
        const errorType = err.serializeErrors()
        const response: ResponseType<typeof errorType> = {
            message: 'There was an error',
            error: err.serializeErrors()
        }
        return res.status(err.statusCode).json(response)
    }

    const errorType = err.message
    const response: ResponseType<typeof errorType> = {
        message: 'There was an error',
        error: err.message
    }

    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(response)

    return next()
}

export { errorHandler }
