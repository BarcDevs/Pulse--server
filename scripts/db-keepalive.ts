/**
 * Pings the dev Postgres DB every few minutes to prevent Neon's 5-min
 * autosuspend, but only during allowed hours. Neon free tier caps at
 * 100 CU-hours/month (~400hr at 0.25 CU) - do NOT run this unattended
 * 24/7, only alongside an active dev session.
 *
 * Usage: npx tsx scripts/db-keepalive.ts
 * Stop with Ctrl+C.
 */
import 'dotenv/config'
import { Pool } from 'pg'

const PING_INTERVAL_MS = 4 * 60 * 1000
const ALLOWED_START_HOUR = 10
const ALLOWED_END_HOUR = 21

const connectionString = process.env.DATABASE_URL || process.env.DEV_DATABASE_URL
if (!connectionString) {
    throw new Error('DATABASE_URL / DEV_DATABASE_URL not set - aborting')
}

const pool = new Pool({ connectionString })

const isAllowedHour = (): boolean => {
    const hour = new Date().getHours()
    return hour >= ALLOWED_START_HOUR && hour < ALLOWED_END_HOUR
}

const ping = async (): Promise<void> => {
    if (!isAllowedHour()) {
        console.info(`[keepalive] ${new Date().toISOString()} outside allowed window (10:00-21:00) - skipping ping`)
        return
    }

    try {
        await pool.query('SELECT 1')
        console.info(`[keepalive] ${new Date().toISOString()} ping ok`)
    } catch (err) {
        console.error(`[keepalive] ${new Date().toISOString()} ping failed`, err)
    }
}

console.info(`[keepalive] starting, interval ${PING_INTERVAL_MS / 1000}s, allowed window ${ALLOWED_START_HOUR}:00-${ALLOWED_END_HOUR}:00`)

void ping()
const interval = setInterval(() => {
    void ping()
}, PING_INTERVAL_MS)

process.on('SIGINT', () => {
    clearInterval(interval)
    void pool.end().finally(() => {
        // eslint-disable-next-line no-process-exit
        process.exit(0)
    })
})
