import 'dotenv/config'
import express, { type Express } from 'express'

import {
    appConfig,
    env,
    serverConfig
} from '../config'

import exposeProductionApp from './middlewares/exposeProductionApp'
import { declareRoutes } from './routes/declare_routes'
import { scheduleAccountPurge } from './services/accountDeletionService'
import { verifyEmailTransport } from './utils/emailSender'
import logger from './utils/logger'
import prisma from './utils/prismaClient'
import { declareMiddlewares } from './middlewares'

const {
    protocol,
    url
} = serverConfig
const { start } = appConfig

const host = serverConfig.host || '127.0.0.1'

const port = serverConfig.port

const app: Express = express()

app.set('trust proxy', 1)

declareMiddlewares(app)

declareRoutes(app)
exposeProductionApp(app)

// Only start server when not in test environment
if (env !== 'test') {
    const server = app.listen(port, host, () => {
        const serverUrl = url
            .replace(/\{protocol}/g, protocol)
            .replace(/\{host}/g, host)
            .replace(/\{port}/g, port.toString())

        const message = `${start.replace(/\{0}/g, serverUrl)}`

        logger.info(message)

        verifyEmailTransport()
        scheduleAccountPurge()
    })

    const shutdown = (signal: string) => {
        logger.info(`${signal} received, shutting down gracefully`)

        server.close(() => {
            prisma.$disconnect()
                .then(() => {
                    logger.info('Shutdown complete')
                })
                .catch((err: Error) => {
                    logger.error('Error during shutdown', { message: err.message })
                })
        })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
}

export default app
