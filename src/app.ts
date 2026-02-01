import 'express-async-errors'
import dotenv from 'dotenv'
import express, { type Express } from 'express'

import { appConfig, serverConfig } from '../config'

import exposeProductionApp from './middlewares/exposeProductionApp'
import { declareRoutes } from './routes/declare_routes'
import { declareMiddlewares } from './middlewares'

dotenv.config()

const {
    protocol,
    url
} = serverConfig
const { start } = appConfig

const host = serverConfig.host || '0.0.0.0'

const port =
    // add env port import for render deployment
    (process.env.PORT ?
        Number(process.env.PORT) :
        serverConfig.port)

const app: Express = express()

declareMiddlewares(app)

declareRoutes(app)
exposeProductionApp(app)

app.listen(port, host, () => {
    const serverUrl = url
        .replace(/\{protocol}/g, protocol)
        .replace(/\{host}/g, host)
        .replace(/\{port}/g, port.toString())

    const message = `${start.replace(/\{0}/g, serverUrl)}`

    console.info(message)
})

export default app
