import type {
    NextFunction,
    Request,
    Response
} from 'express'

import logger from '../utils/logger'

export const loggerMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const start = Date.now()

    res.on('finish', () => {
        const ms = Date.now() - start
        const { method, path } = req
        const status = res.statusCode
        const userId = req.userId ?? '-'

        logger.http(
            `${method} ${path}
             ${status} ${ms}ms
             userId=${userId}`
        )
    })

    next()
}
