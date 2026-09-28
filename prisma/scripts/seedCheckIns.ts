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

const SEED_USER_EMAILS = [
    'alice@example.com',
    'bob@example.com',
    'carol@example.com',
    'david@example.com',
    'emma@example.com'
]
const FALLBACK_LOOKBACK_DAYS = 90
const MAX_GAP_DAYS = 2
const ACTIVITY_POOL = [
    'meditation',
    'walking',
    'stretching',
    'yoga',
    'reading',
    'therapy',
    'swimming'
]

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const toUtcDate = (date: Date) =>
    new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ))

const addDays = (date: Date, days: number) => {
    const next = new Date(date)
    next.setUTCDate(next.getUTCDate() + days)
    return next
}

const randomActivities = () => {
    const shuffled = [...ACTIVITY_POOL].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, randomInt(1, 3))
}

const seedProfile = async (profileId: string, today: Date, fullLookback: boolean) => {
    const latest = fullLookback
        ? null
        : await prisma.dailyCheckIn.findFirst({
            where: { profileId },
            orderBy: { checkInDate: 'desc' },
            select: { checkInDate: true }
        })
    const start = latest
        ? addDays(toUtcDate(latest.checkInDate), 1)
        : addDays(today, -FALLBACK_LOOKBACK_DAYS)

    let current = start
    let count = 0

    while (current <= today) {
        await prisma.dailyCheckIn.upsert({
            where: {
                profileId_checkInDate: { profileId, checkInDate: current }
            },
            update: {},
            create: {
                profileId,
                checkInDate: current,
                moodScore: randomInt(1, 10),
                painLevel: randomInt(1, 10),
                activities: randomActivities(),
                notes: `Check-in for ${current.toISOString().split('T')[0]}`
            }
        })

        count++
        // 1 = consecutive day, 2-3 = skipped 1-2 days
        current = addDays(current, randomInt(1, MAX_GAP_DAYS + 1))
    }

    return count
}

const main = async () => {
    const today = toUtcDate(new Date())
    // Emails passed as args are refilled over the full lookback window, skipping days that already exist
    const requestedEmails = process.argv.slice(2)
    const fullLookback = requestedEmails.length > 0
    const users = await prisma.user.findMany({
        where: { email: { in: fullLookback ? requestedEmails : SEED_USER_EMAILS } },
        select: { email: true, profile: { select: { id: true } } }
    })

    for (const user of users) {
        if (!user.profile) {
            console.info(`Skipping ${user.email}: no profile`)
            continue
        }

        const count = await seedProfile(user.profile.id, today, fullLookback)
        console.info(`${user.email}: ${count} check-ins upserted`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        throw e
    })
    .finally(() => prisma.$disconnect())
