import { type Options } from 'express-rate-limit'

import { HttpStatusCodes } from '../constants/httpStatusCodes'

export const createTooManyRequestsHandler = (
    message: string
): Options['handler'] =>
    (_req, res) => {
        res
            .status(HttpStatusCodes.TOO_MANY_REQUESTS)
            .json({
                message,
                error: [
                    {
                        statusType: 'Too Many Requests',
                        statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                        error: message
                    }
                ]
            })
    }
