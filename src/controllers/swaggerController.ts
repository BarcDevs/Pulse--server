import {
    type NextFunction,
    type Request,
    type Response
} from 'express'

export const swagger = (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    res.setHeader(
        'Content-Security-Policy',
        'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:;'
    )
    next()
}