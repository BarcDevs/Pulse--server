# Error: CustomError instances logged at error level instead of warn

- **Signature:** `Error: Unhandled error caught Unauthorized! please login first!`
- **First seen:** 2026-09-30
- **Occurrences:** 16
- **Routes affected:** `/api/v2/forum/posts`, `/api/v2/auth/me`
- **Root cause:** `errorHandler.ts` called `logger.error('Unhandled error caught', ...)` unconditionally before checking whether the error was a `CustomError` (expected app-level error). `CustomError` subclasses represent expected responses (401, 403, 404, etc.) that are handled and returned to the client — logging them at `error` level pollutes prod error monitoring with normal application behaviour. After the recent commit requiring auth on forum reads (`8567375`), unauthenticated GET requests to `/api/v2/forum/posts` generate a steady stream of 401s that all appeared as errors.
- **Fix:** Moved `CustomError` check before the log call; `CustomError` instances now log at `warn` level ("App error") and only genuinely unhandled/unexpected exceptions log at `error` level ("Unhandled error caught"). Commit: 9687dbc (fix/monitor-error-handler-log-level, merged into development 2026-09-30).
