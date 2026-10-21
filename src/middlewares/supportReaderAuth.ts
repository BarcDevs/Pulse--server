import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { supportReaderConfig } from '../../config'
import { supportReaderSecretMinLength } from '../constants/support/supportTickets'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { isBearerSecretValid } from '../utils/bearerSecret'

// Credential for the Claude support-ticket reader. Accepted only by the
// routes that list it; fails closed while the secret is unset or too short
export const supportReaderAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const isSecretValid = isBearerSecretValid(
        req.headers.authorization,
        supportReaderConfig.secret,
        supportReaderSecretMinLength
    )

    if (!isSecretValid)
        throw errorFactory.auth.unauthorized()

    return next()
}
