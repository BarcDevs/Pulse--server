import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { authConfig } from '../../config'
import {
    GUEST_HEADER_FORBIDDEN_MESSAGE,
    GUEST_REQUEST_HEADER
} from '../constants/auth/authRules'
import { errorFactory } from '../errors/factory/ErrorFactory'
import logger from '../utils/logger'

export const requireGuestHeader = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (req.headers[GUEST_REQUEST_HEADER]) return next()

    if (authConfig.requireGuestHeader) {
        throw errorFactory.auth.forbidden(
            GUEST_HEADER_FORBIDDEN_MESSAGE
        )
    }

    logger.warn(
        `POST /auth/guest without the ${GUEST_REQUEST_HEADER} header`
    )

    return next()
}
