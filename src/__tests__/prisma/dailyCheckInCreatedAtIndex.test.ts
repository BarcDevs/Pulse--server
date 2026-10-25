import fs from 'fs'
import path from 'path'

const PRISMA_DIR = path.resolve(__dirname, '../../../prisma')
const INDEX_NAME = 'DailyCheckIn_createdAt_idx'

const getDailyCheckInModel = () => {
    const schema = fs.readFileSync(
        path.join(PRISMA_DIR, 'schema.prisma'),
        'utf8'
    )
    const match = schema.match(
        /model DailyCheckIn \{[\s\S]*?\n\}/
    )
    return match ? match[0] : ''
}

const getIndexMigrationSql = () => {
    const migrationsDir = path.join(PRISMA_DIR, 'migrations')
    return fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => fs.readFileSync(
            path.join(migrationsDir, entry.name, 'migration.sql'),
            'utf8'
        ))
        .filter(sql => sql.includes(INDEX_NAME))
}

describe('DailyCheckIn createdAt index', () => {
    it('is declared in the Prisma schema', () => {
        expect(getDailyCheckInModel())
            .toContain('@@index([createdAt])')
    })

    it('is created by exactly one migration', () => {
        expect(getIndexMigrationSql()).toHaveLength(1)
    })

    it('migration only creates the index', () => {
        const [sql] = getIndexMigrationSql()
        const statements = sql
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('--'))
            .join(' ')
            .split(';')
            .map(statement => statement.trim())
            .filter(Boolean)

        expect(statements).toEqual([
            `CREATE INDEX "${INDEX_NAME}" ON "DailyCheckIn"("createdAt")`
        ])
    })
})
