import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../../config'
import { PrismaClient } from '../../prisma/generated/prisma/client'

import logger from './logger'

let client: PrismaClient

export const getPrismaClient = (): PrismaClient => {
    if (!client) {
        const connectionString = databaseConfig.url

        const pool = new Pool({
            connectionString,
            max: databaseConfig.poolMax,
            connectionTimeoutMillis:
                databaseConfig.connectionTimeoutMs,
            idleTimeoutMillis: databaseConfig.idleTimeoutMs
        })

        // Set per session: Neon drops the statement_timeout startup
        // parameter, a SET on connect works on every host.
        pool.on('connect', (poolClient) => {
            poolClient.query(
                `SET statement_timeout = ${Number(databaseConfig.statementTimeoutMs)}`
            ).catch((err: Error) => {
                logger.error('Failed to set statement timeout', {
                    message: err.message
                })
            })
            logger.debug('Database pool connected')
        })

        pool.on('error', (err: Error) => {
            logger.error('Database pool error', {
                message: err.message
            })
        })

        // PrismaPg constructor expects a specific internal pg.Pool type
        // that doesn't match the public pg.Pool type signature.
        // This is a limitation of the Prisma adapter library - the types
        // are incompatible despite the runtime working correctly.
        // Using `any` is unavoidable here without abandoning type safety elsewhere.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = new PrismaPg(pool as any)

        const baseClient = new PrismaClient({
            adapter,
            errorFormat: 'minimal',
            log: [
                ...(isDev
                    ? [
                        { emit: 'stdout', level: 'info' },
                        { emit: 'stdout', level: 'warn' },
                        { emit: 'stdout', level: 'error' }
                    ] as const
                    : []),
                { emit: 'event', level: 'query' }
            ]
        })

        // Only the SQL text (placeholders, no bound values) and timing are
        // logged, so row data never reaches the logs.
        baseClient.$on('query', (event) => {
            if (event.duration >= databaseConfig.slowQueryMs) {
                logger.warn('Slow database query', {
                    durationMs: event.duration,
                    query: event.query
                })
            }
        })

        client = baseClient

        logger.info(
            `Prisma client initialized. Database connected to ${isDev ? 'dev' : 'prod'} database`
        )
    }

    return client
}

const Prisma = getPrismaClient()

export default Prisma
