import { type Options } from 'express-rate-limit'

import { errorFactory } from '../errors/factory/ErrorFactory'

export const createTooManyRequestsHandler = (
    message: string
): Options['handler'] =>
    (_req, _res, next) => next(
        errorFactory.generic.tooManyRequests(message)
    )
