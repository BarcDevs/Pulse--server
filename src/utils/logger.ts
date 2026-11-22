import path from 'path'
import winston from 'winston'

import {
    isDev,
    isProd,
    loggingConfig
} from '../../config'

import { CloudWatchErrorTransport } from './cloudWatchErrorTransport'

const logDir = path.isAbsolute(loggingConfig.dir)
    ? loggingConfig.dir
    : path.resolve(process.cwd(), loggingConfig.dir)

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({
        level,
        message,
        metadata
    }) => {
        const meta =
            metadata && Object.keys(metadata).length
                ? `\n${JSON.stringify(
                    metadata,
                    null,
                    2
                )}`
                : ''
        return `${level}: ${message}${meta}`
    })
)

const transports: winston.transport[] = [
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error'
    }),
    new winston.transports.File({
        filename: path.join(logDir, 'warn.log'),
        level: 'warn'
    })
]

// isProd comes from APP_ENV, so Render staging (NODE_ENV=production,
// APP_ENV=staging) has no AWS credentials and must not ship
if (isProd && loggingConfig.cloudWatchErrorLogGroup) {
    transports.push(
        new CloudWatchErrorTransport({
            logGroupName: loggingConfig.cloudWatchErrorLogGroup,
            region: loggingConfig.cloudWatchRegion
        })
    )
}

transports.push(
    new winston.transports.Console({
        format: isDev
            ? consoleFormat
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
    })
)

const logger: winston.Logger = winston.createLogger({
    level: 'http',
    transports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.metadata(),
        winston.format.prettyPrint()
    )
})

export default logger
