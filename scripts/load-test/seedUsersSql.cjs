// Prints the SQL that creates N confirmed load-test users and their profiles, for
// a clone database (milestone H3). Used instead of the sign-up API so no mail is
// sent to the fake addresses and no sign-up limit is hit.
//
//   node scripts/load-test/seedUsersSql.cjs 1500 > seed.sql
//   psql "$DATABASE_URL" -f seed.sql
//
// The password is LOAD_TEST_PASSWORD (default LoadTest-Password1!), hashed once here with
// the same bcrypt cost (12) as the server, so a login costs the server what a real one does.
const bcrypt = require('bcrypt')

const count = Number(process.argv[2] || 1000)
const password = process.env.LOAD_TEST_PASSWORD || 'LoadTest-Password1!'
const prefix = process.env.EMAIL_PREFIX || 'loadtest'
const domain = process.env.EMAIL_DOMAIN || 'example.test'

if (!Number.isInteger(count) || count < 1) {
    throw new Error('Pass the number of users as the first argument')
}

const hash = bcrypt.hashSync(password, 12)

process.stdout.write(`-- ${count} load-test users, created by scripts/load-test/seedUsersSql.cjs
BEGIN;
INSERT INTO "User" ("id", "firstName", "lastName", "username", "email", "password", "emailVerifiedAt")
SELECT gen_random_uuid()::text, 'Load', 'User' || n, 'loaduser' || n,
       '${prefix}+' || n || '@${domain}', '${hash}', now()
FROM generate_series(1, ${count}) AS n
ON CONFLICT DO NOTHING;
INSERT INTO "Profile" ("id", "userId", "updatedAt")
SELECT gen_random_uuid()::text, u."id", now() FROM "User" u
WHERE u."email" LIKE '${prefix}+%@${domain}'
  AND NOT EXISTS (SELECT 1 FROM "Profile" p WHERE p."userId" = u."id");
COMMIT;
`)
