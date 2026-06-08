import { execSync } from 'child_process'

const globalSetup = async (): Promise<void> => {
    const testDbUrl =
        process.env.TEST_DATABASE_URL
        ?? 'postgresql://postgres:postgres@localhost:5433/pulse_test'

    execSync('npx prisma migrate deploy', {
        env: {
            ...process.env,
            DATABASE_URL: testDbUrl,
            DEV_DATABASE_URL: testDbUrl
        },
        stdio: 'inherit',
        timeout: 60000
    })
}

export default globalSetup
