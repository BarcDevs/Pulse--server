import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../../config'
import {
    Prisma as PrismaNamespace,
    PrismaClient
} from '../../prisma/generated/prisma/client'

import logger from './logger'

export { PrismaNamespace as Prisma }

let client: PrismaClient

export const getPrismaClient = (): PrismaClient => {
    if (!client) {
        const connectionString = databaseConfig.url

        const pool = new Pool({ connectionString })

        pool.on('connect', () => {
            logger.info('Database pool connected')
        })

        pool.on('error', (err: Error) => {
            logger.error('Database pool error', {
                message: err.message
            })
        })

        const adapter = new PrismaPg(
            pool as unknown as Parameters<
                typeof PrismaPg
            >[0]
        )

        client = new PrismaClient({
            adapter,
            errorFormat: 'minimal',
            log:
                isDev ? ['query', 'info', 'warn', 'error']
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
