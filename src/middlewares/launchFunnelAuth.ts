import crypto from 'crypto'
import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { launchFunnelConfig } from '../../config'
import { launchFunnelSecretMinLength } from '../constants/launchFunnel'
import { errorFactory } from '../errors/factory/ErrorFactory'

const bearerPrefix = 'Bearer '

const digest = (value: string) =>
    crypto.createHash('sha256').update(value).digest()

// Fails closed: an unset or too-short secret rejects every request
export const launchFunnelAuth = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const { secret } = launchFunnelConfig
    const header = req.headers.authorization

    const isSecretConfigured =
        secret.length >= launchFunnelSecretMinLength

    const isSecretValid =
        isSecretConfigured
        && !!header?.startsWith(bearerPrefix)
        && crypto.timingSafeEqual(
            digest(header.slice(bearerPrefix.length)),
            digest(secret)
        )

    if (!isSecretValid)
        throw errorFactory.auth.unauthorized()

    return next()
}
