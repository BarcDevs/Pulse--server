import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { GUEST_FORBIDDEN_MESSAGE } from '../constants/auth/authRules'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { getSession } from '../services/authService'

const authenticate = (allowGuest: boolean) => async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const session = await getSession(
        req.cookies.accessToken
    )

    if (!session) {
        res.clearCookie('accessToken')

        throw errorFactory.auth.unauthorized()
    }

    if (session.isGuest && !allowGuest)
        throw errorFactory.auth.forbidden(
            GUEST_FORBIDDEN_MESSAGE
        )

    req.userId = session.userId
    req.isGuest = session.isGuest

    next()
}

// Guests are rejected by default; only the routes a guest may use opt in
export const isAuthenticated = authenticate(false)
export const isAuthenticatedOrGuest = authenticate(true)
