import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { getSessionUserId } from '../services/authService'

export const optionalAuthentication = async (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    req.userId = await getSessionUserId(
        req.cookies.accessToken
    ) ?? undefined

    next()
}
