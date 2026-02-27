import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, {type Express} from 'express'
import helmet from 'helmet'
import hpp from 'hpp'
import path from 'path'

import {serverConfig} from '../../config'

import {loggerMiddleware} from './loggerMiddleWare'
import {rateLimiter} from './rate-limiting'
import {sanitizeData} from './sanitaization'

export const declareMiddlewares = (app: Express) => {
    // Middlewares
    app.use(cookieParser())
    app.use(helmet())
    app.use(compression())
    app.use(
        cors({
            credentials: true,
            origin: [serverConfig.origin]
        })
    )
    app.use(loggerMiddleware)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    app.use(express.static(
        path.join(
            __dirname,
            'public'
        )
    ))

    app.use(sanitizeData) // sanitize data from request body
    app.use(hpp()) // http params pollution prevention
    app.use(rateLimiter) // rate limiting for api requests

    return app
}
