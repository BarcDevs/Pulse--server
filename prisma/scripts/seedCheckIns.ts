import 'dotenv/config'
import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../../config'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = databaseConfig.url
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter,
    errorFormat: 'minimal',
    log: isDev ? ['query', 'info', 'warn', 'error'] : undefined
})

const PROFILE_ID = '32924c7b-df51-42a1-bfe6-013cba728fb2'
const START_DATE = new Date('2026-04-25')
const END_DATE = new Date('2026-05-14')

async function main() {
    const profileId = PROFILE_ID
    console.info(`Seeding check-ins for profile ${profileId}`)

    const current = new Date(START_DATE)
    let count = 0

    while (current <= END_DATE) {
        const checkInDate = new Date(current)
        checkInDate.setHours(
            0,
            0,
            0,
            0
        )

        await prisma.dailyCheckIn.upsert({
            where: {
                profileId_checkInDate: { profileId, checkInDate }
            },
            update: {},
            create: {
                profileId,
                checkInDate,
                moodScore: Math.floor(Math.random() * 10) + 1,
                painLevel: Math.floor(Math.random() * 10) + 1,
                activities: ['meditation', 'walking'],
                notes: `Check-in for ${checkInDate.toISOString().split('T')[0]}`
            }
        })

        count++
        current.setDate(current.getDate() + 1)
    }

    console.info(`Done. ${count} check-ins upserted.`)
}

main()
    .catch((e) => {
        console.error(e)
        throw e
    })
    .finally(() => prisma.$disconnect())
