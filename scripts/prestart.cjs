// npm prestart hook: apply migrations on staging only (APP_ENV=staging).
// Production (Docker) starts with `node src/app.js` and never reaches this.
// Cross-platform (no shell syntax); a failed migrate exits non-zero and
// aborts `npm start`.
const { execSync } = require('child_process')

if (process.env.APP_ENV === 'staging') {
    execSync(
        'npx prisma migrate deploy --schema=prisma/schema.prisma',
        { stdio: 'inherit' }
    )
}
