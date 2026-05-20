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
            keepAlive: true,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        })

        pool.on('connect', () => {
            logger.info('Database pool connected')
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

        client = new PrismaClient({
            adapter,
            errorFormat: 'minimal',
            log:
                isDev ? ['info', 'warn', 'error']
                    : undefined
        })

        logger.info(
            `Prisma client initialized. Database connected to ${isDev ? 'dev' : 'prod'} database`
        )
    }

    return client
}

const Prisma = getPrismaClient()

export default Prisma
