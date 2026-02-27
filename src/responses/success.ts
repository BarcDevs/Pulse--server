import type {Response} from 'express'

import {HttpStatusCodes} from '../constants/httpStatusCodes'
import type {ResponseType} from '../types/ResponseType'

export const successResponse = <T>(
    res: Response,
    data: T,
    message = 'Action completed successfully',
    status = HttpStatusCodes.OK,
) => {
    const response: ResponseType<T> = {
        message,
        data,
    }
    res.status(status).json(response)
}
