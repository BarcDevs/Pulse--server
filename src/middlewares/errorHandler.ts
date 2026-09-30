import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { isDev } from '../../config'
import { ErrorCodes } from '../constants/errorCodes'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { CustomError } from '../errors/CustomError'
import type { ResponseType } from '../types/responseType'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const logMeta = {
        ...toLoggableError(err),
        method: req.method,
        // Path only: query strings can carry secrets (OAuth code/state)
        route: req.path
    }

    if (err instanceof CustomError) {
        logger.warn(
            'App error',
            logMeta
        )
        const errorType = err.serializeErrors()
        const response: ResponseType<typeof errorType> = {
            message: err.message,
            error: errorType
        }
        return res.status(err.statusCode).json(response)
    }

    logger.error(
        'Unhandled error caught',
        logMeta
    )

    const response: ResponseType<{
        statusType: string
        statusCode: number
        code: string
        error: string
    }[]> = {
        message: 'Something went wrong',
        error: [
            {
                statusType: 'Internal Server Error',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                code: ErrorCodes.INTERNAL_ERROR,
                error: isDev ? err.message : 'Internal server error'
            }
        ]
    }

    return res
        .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json(response)
}