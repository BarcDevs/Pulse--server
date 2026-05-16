import winston from 'winston'

import { isDev } from '../../config'

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
        filename: 'logs/error.log',
        level: 'error'
    }),
    new winston.transports.File({
        filename: 'logs/warn.log',
        level: 'warn'
    })
]

if (isDev) {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat
        })
    )
}

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
