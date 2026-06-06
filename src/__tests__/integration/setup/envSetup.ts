const testDbUrl =
    process.env.TEST_DATABASE_URL
    ?? 'postgresql://postgres:postgres@localhost:5433/pulse_test'

process.env.DEV_DATABASE_URL = testDbUrl
process.env.DATABASE_URL = testDbUrl
