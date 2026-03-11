import 'dotenv/config'
import {Pool} from 'pg'

import {PrismaPg} from '@prisma/adapter-pg'

import {databaseConfig, isDev} from '../config'

import {
    PrismaClient
} from './generated/prisma/client'

const connectionString = databaseConfig.url

const pool = new Pool({connectionString})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter,
    errorFormat: 'minimal',
    log:
        isDev
            ? ['query', 'info', 'warn', 'error']
            : undefined
})

async function main() {
    console.info('Finding users without profiles...')

    const usersWithoutProfiles = await prisma.user.findMany({
        where: {
            profile: null
        },
        select: {
            id: true,
            email: true
        }
    })

    console.info(`Found ${usersWithoutProfiles.length} users without profiles`)

    if (usersWithoutProfiles.length === 0) {
        console.info('All users already have profiles')
        return
    }

    console.info('Creating profiles for users...')

    for (const user of usersWithoutProfiles) {
        await prisma.profile.create({
            data: {
                userId: user.id
            }
        })

        console.info(`Created profile for user ${user.email}`)
    }

    console.info('Backfill complete!')
}

main()
    .catch((e) => {
        console.error(e)
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })