import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { launchFunnelConfig } from '../../config'
import { launchFunnelSecretMinLength } from '../constants/launchFunnel'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { isBearerSecretValid } from '../utils/bearerSecret'

export const launchFunnelAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const isSecretValid = isBearerSecretValid(
        req.headers.authorization,
        launchFunnelConfig.secret,
        launchFunnelSecretMinLength
    )

    if (!isSecretValid)
        throw errorFactory.auth.unauthorized()

    return next()
}
