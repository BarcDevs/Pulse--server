import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { errorFactory } from '../errors/factory/ErrorFactory'
import { getSessionUserId } from '../services/authService'

export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = await getSessionUserId(
        req.cookies.accessToken
    )

    if (!userId) {
        res.clearCookie('accessToken')

        throw errorFactory.auth.unauthorized()
    }

    req.userId = userId

    next()
}
