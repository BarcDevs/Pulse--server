import { spawnSync } from 'child_process';
import path from 'path';

const scriptPath = path.resolve(__dirname, '../../../scripts/deploy/ec2-redeploy.sh').split(path.sep).join('/');

const runGate = (fn: string, input: string) => spawnSync('bash', ['-c', `source "${scriptPath}" test-tag; ${fn}`], {
    input,
    encoding: 'utf8',
    env: { ...process.env, REDEPLOY_SOURCE_ONLY: '1' }
});

const statusWithPending = [
    'Datasource "db": PostgreSQL database "pulse"',
    '',
    '2 migrations found in prisma/migrations',
    '',
    'Following migrations have not yet been applied:',
    '20260901120000_add_support_contact',
    '20260910083000_drop_legacy_column',
    '',
    'To apply migrations in development run prisma migrate dev.',
    ''
].join('\n');

describe('ec2-redeploy.sh migration gate', () => {
    describe('pending_migration_names', () => {
        it('lists only the pending migrations', () => {
            const result = runGate('pending_migration_names', statusWithPending);

            expect(result.status).toBe(0);
            expect(result.stdout.trim().split('\n')).toEqual([
                '20260901120000_add_support_contact',
                '20260910083000_drop_legacy_column'
            ]);
        });

        it('returns nothing when the schema is up to date', () => {
            const result = runGate('pending_migration_names', 'Database schema is up to date!\n');

            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('');
        });

        it('ignores already-applied migration names outside the pending block', () => {
            const input = '20200101000000_old_applied\n\n' + statusWithPending;
            const result = runGate('pending_migration_names', input);

            expect(result.stdout).not.toContain('20200101000000_old_applied');
        });
    });

    describe('is_destructive_sql', () => {
        it.each([
            'ALTER TABLE "User" DROP COLUMN "nickname";',
            'DROP TABLE "Legacy";',
            'ALTER TABLE "User" RENAME COLUMN "a" TO "b";',
            'ALTER TABLE "User" RENAME TABLE "a" TO "b";',
            'alter table "User" drop column "nickname";'
        ])('flags destructive SQL: %s', (sql) => {
            expect(runGate('is_destructive_sql', sql).status).toBe(0);
        });

        it.each([
            'ALTER TABLE "User" ADD COLUMN "nickname" TEXT;',
            'CREATE TABLE "SupportContact" ("id" SERIAL PRIMARY KEY);',
            'CREATE INDEX "idx" ON "User"("email");',
            ''
        ])('allows additive SQL: %s', (sql) => {
            expect(runGate('is_destructive_sql', sql).status).toBe(1);
        });
    });
});
