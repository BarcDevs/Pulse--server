import Csrf from 'csrf'
import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { errorFactory } from '../errors/factory'

const csrfProtection = new Csrf()

export const extractCsrfToken = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    req.csrfToken =
        req.headers['x-csrf-token'] as string

    next()
}

export const csrfMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const { csrfToken } = req
    const { _csrf } = req.cookies

    const isCSRFValid =
        csrfProtection.verify(_csrf, csrfToken || '')

    if (!isCSRFValid) {
        throw errorFactory.auth.unauthorized(
            'CSRF token is invalid or missing'
        )
    }

    return next()
}
