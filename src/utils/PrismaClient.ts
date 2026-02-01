import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, env } from '../../config'
import { PrismaClient } from '../../prisma/generated/prisma/client'

let client: PrismaClient

export const getPrismaClient = (): PrismaClient => {
    if (!client) {
        const connectionString = databaseConfig.url

        const pool = new Pool({ connectionString })
        const adapter = new PrismaPg(pool)

        client = new PrismaClient({
            adapter,
            errorFormat: 'minimal',
            log:
                env === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : undefined
        })
    }

    return client
}

const Prisma = getPrismaClient()

export default Prisma
