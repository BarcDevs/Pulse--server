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
            'alter table "User" drop column "nickname";',
            'ALTER TABLE "User" ALTER COLUMN "age" SET DATA TYPE INTEGER;',
            'ALTER TABLE "User" ALTER COLUMN "age" TYPE INTEGER;',
            'ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;',
            'ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL;',
            'TRUNCATE TABLE "Report";',
            'DELETE FROM "Report";',
            `UPDATE "User" SET "plan" = 'free';`,
            'DROP TYPE "Role";',
            'ALTER TABLE "User"\n  DROP COLUMN "nickname";'
        ])('flags destructive SQL: %s', (sql) => {
            expect(runGate('is_destructive_sql', sql).status).toBe(0);
        });

        it.each([
            'ALTER TABLE "User" ADD COLUMN "nickname" TEXT;',
            'CREATE TABLE "SupportContact" ("id" SERIAL PRIMARY KEY);',
            'CREATE INDEX "idx" ON "User"("email");',
            `ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';`,
            '-- we no longer DROP COLUMN here\nALTER TABLE "User" ADD COLUMN "x" TEXT;',
            ''
        ])('allows additive SQL: %s', (sql) => {
            expect(runGate('is_destructive_sql', sql).status).toBe(1);
        });
    });

    describe('gate loop over pending migrations', () => {
        // Mirrors the deploy loop: names from pending_migration_names, SQL fed to is_destructive_sql.
        // Returns the first flagged migration name on stdout and exit 1, else exit 0.
        const runLoop = (status: string, migrations: Record<string, string>) => {
            const cases = Object.entries(migrations)
                .map(([name, sql]) => `${name}) cat <<'SQL_EOF'\n${sql}\nSQL_EOF\n;;`)
                .join('\n');
            const script = `source "${scriptPath}" test-tag
set +e
sql_for() { case "$1" in
${cases}
esac; }
for name in $(printf '%s\n' "$STATUS" | pending_migration_names); do
    if sql_for "$name" | is_destructive_sql; then echo "$name"; exit 1; fi
done
exit 0`;
            return spawnSync('bash', ['-c', script], {
                encoding: 'utf8',
                env: { ...process.env, REDEPLOY_SOURCE_ONLY: '1', STATUS: status }
            });
        };

        const status = (names: string[]) => [
            `${names.length} migrations found in prisma/migrations`,
            '',
            'Following migrations have not yet been applied:',
            ...names,
            '',
            'To apply migrations in development run prisma migrate dev.',
            ''
        ].join('\n');

        const createTable = `-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);`;

        it('flags CREATE TABLE plus ADD COLUMN NOT NULL without DEFAULT', () => {
            const result = runLoop(status(['20261101000000_bad']), {
                '20261101000000_bad': `${createTable}\n\n-- AlterTable\nALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL;`
            });

            expect(result.status).toBe(1);
            expect(result.stdout.trim()).toBe('20261101000000_bad');
        });

        it('passes purely additive migrations', () => {
            const result = runLoop(status(['20261101000000_ok']), {
                '20261101000000_ok': `${createTable}\n\n-- CreateIndex\nCREATE INDEX "Report_title_idx" ON "Report"("title");\n\n-- AlterTable\nALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';\nALTER TABLE "User" ADD COLUMN "note" TEXT;`
            });

            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('');
        });

        it('does not trip on a DROP COLUMN inside a comment', () => {
            const result = runLoop(status(['20261101000000_comment']), {
                '20261101000000_comment': `-- previous release did DROP COLUMN "legacy"\n${createTable}`
            });

            expect(result.status).toBe(0);
        });

        it('reports the destructive migration among several pending ones', () => {
            const result = runLoop(status(['20261101000000_ok', '20261102000000_drop']), {
                '20261101000000_ok': createTable,
                '20261102000000_drop': 'ALTER TABLE "User" DROP COLUMN "nickname";'
            });

            expect(result.status).toBe(1);
            expect(result.stdout.trim()).toBe('20261102000000_drop');
        });

        it('ignores destructive SQL in already-applied migrations', () => {
            const result = runLoop('20200101000000_old\n\n' + status(['20261101000000_ok']), {
                '20200101000000_old': 'DROP TABLE "Legacy";',
                '20261101000000_ok': createTable
            });

            expect(result.status).toBe(0);
        });
    });
});
