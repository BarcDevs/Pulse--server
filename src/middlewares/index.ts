import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import hpp from 'hpp'
import path from 'path'

import { serverConfig } from '../../config'

import { loggerMiddleware } from './loggerMiddleWare'
import { rateLimiter } from './rateLimiting'
import { sanitizeData } from './sanitaization'

export const declareMiddlewares = (app: Express) => {
    // Middlewares
    app.use(cookieParser())
    app.use(helmet())
    app.use(compression())
    app.use(
        cors({
            credentials: true,
            origin: (origin, callback) => {
                // Allow no origin (Postman, cURL, desktop apps)
                if (!origin) {
                    callback(null, true)
                    return
                }

                const normalizeUrl = (url: string) => url.replace(/\/$/, '')
                const normalizedOrigin = normalizeUrl(serverConfig.origin)

                if (
                    origin.startsWith('http://localhost:')
                    || origin.startsWith('http://127.0.0.1:')
                    || normalizeUrl(origin) === normalizedOrigin
                ) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        })
    )
    app.use(loggerMiddleware)
    app.use(express.json())
    app.use(express.urlencoded({
        extended: false
    }))
    app.use(express.static(
        path.join(__dirname, '../../public')
    ))

    app.use(sanitizeData)
    app.use(hpp())
    app.use(rateLimiter)

    return app
}
