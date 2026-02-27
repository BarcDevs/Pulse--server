import type {
    NextFunction,
    Request,
    Response
} from 'express'
import jwt from 'jsonwebtoken'

import {authConfig} from '../../config'
import {errorFactory} from '../errors/factory'
import type {UserType} from '../types/data/UserType'

export const isAuthenticated = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { accessToken } = req.cookies

        const { id } = jwt.verify(
            accessToken,
            authConfig.jwtSecret!
        ) as Partial<UserType>

        req.userId = id

        next()
    } catch (error) {
        res.clearCookie('accessToken')

        console.error('Error authenticating user', error)

        throw errorFactory.auth.unauthorized()
    }
}
