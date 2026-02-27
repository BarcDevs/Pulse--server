import 'dotenv/config'
import 'express-async-errors'
import express, {type Express} from 'express'

import {appConfig, env, serverConfig} from '../config'

import exposeProductionApp from './middlewares/exposeProductionApp'
import {declareRoutes} from './routes/declare_routes'
import {declareMiddlewares} from './middlewares'

const {
    protocol,
    url
} = serverConfig
const { start } = appConfig

const host = serverConfig.host || '0.0.0.0'

const port = serverConfig.port

const app: Express = express()

declareMiddlewares(app)

declareRoutes(app)
exposeProductionApp(app)

// Only start server when not in test environment
if (env !== 'test') {
    app.listen(port, host, () => {
        const serverUrl = url
            .replace(/\{protocol}/g, protocol)
            .replace(/\{host}/g, host)
            .replace(/\{port}/g, port.toString())

        const message = `${start.replace(/\{0}/g, serverUrl)}`

        console.info(message)
    })
}

export default app
