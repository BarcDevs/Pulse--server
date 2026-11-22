# Test users on production

Real accounts on production that run a routine (login, check-in, read insights, browse and post in the forum) so the app is used steadily and bugs show up while real traffic is low. They are real users in the database, not mocks. This file is the one source for how to recognise them.

## Naming rule

A test user's email is `testuser+N@pulserehab.app`, with `N` a whole number.

- One mailbox receives all of them: Cloudflare Email Routing rule `testuser@pulserehab.app` to the owner's inbox, with "Enable subaddressing" on, so OTP and reset mails reach the owner.
- Match with the pattern `^testuser\+[0-9]+@pulserehab\.app$`, case-insensitive. Every exclude (analytics, the admin dashboard, the cost and error numbers) uses this pattern and nothing else.
- Legacy exception: test user 1 was created as `pulse-test-1@pulserehab.app`, which has no mailbox. Until its email is changed (a production write, owner's go) every exclude also lists that one address. Remove the exception when it changes.

## Excluding them

SQL (Postgres, case-insensitive match):

```sql
WHERE email !~* '^testuser\+[0-9]+@pulserehab\.app$'
  AND email <> 'pulse-test-1@pulserehab.app'
```

In code, the pattern and the legacy address come from one constant, added with the analytics work (milestone J6), so there is one place to change.

## Credentials

Passwords live only in the gitignored `.env` of the owner's machine, never in Secrets Manager, the repo or the chat:

```
PULSE_TEST_USER_<N>_EMAIL
PULSE_TEST_USER_<N>_PASSWORD
```

## The routine

`scripts/test-users/routine.ts` (branch `feat/test-user-routine`, not merged yet). Run `npx tsx scripts/test-users/routine.ts [--user=N]`. Two Windows scheduled tasks run it at 12:00 and 18:00; results go to `logs/test-users/<date>.jsonl` and failed steps to `logs/test-users/failures.jsonl` in the main checkout (gitignored). See `docs/AWS-MIGRATION-MILESTONES.md`, J4 and J4a.

## Adding a user

1. Pick the next `N`, sign up `testuser+N@pulserehab.app` through the API with a generated password.
2. Add the two `.env` keys. Never print the password.
3. Run the routine once with `--user=N` and read the result.
