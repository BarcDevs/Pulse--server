import type {
    NextFunction,
    Request,
    Response
} from 'express'
import jwt from 'jsonwebtoken'

import { authConfig } from '../../config'
import type { UserType } from '../types/data/UserType'

export const optionalAuthentication = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const { id } = jwt.verify(
            req.cookies.accessToken,
            authConfig.jwtSecret,
            { algorithms: ['HS256'] }
        ) as Partial<UserType>

        req.userId = id
    } catch {
        req.userId = undefined
    }

    next()
}
