import path from 'path'
import winston from 'winston'

import { isDev, loggingConfig } from '../../config'

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

if (loggingConfig.cloudWatchErrorLogGroup) {
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
