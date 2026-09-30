# Error: Unhandled error caught Route not found

- **Signature:** `Error: Unhandled error caught Route not found! please check your inputs and try again!`
- **First seen:** 2026-10-01
- **Route:** `GET /api/.env` (bot probe)
- **Root cause:** `CustomError` base class never set `this.name`, so all subclasses (including `NotFoundError`) inherited `"Error"` from `Error.prototype`. `processLogs.ts` `is404` check relies on `entry.metadata?.name === 'NotFoundError'` to route 404s into the 404 Patterns bucket; without this fix, route-not-found errors from bot probes were classified as unknown errors instead of 404 patterns. Additionally, because `err.name` was `"Error"`, prod logs showed `name: "Error"` for all custom error subclasses.
- **Fix:** Added `this.name = new.target.name` to `CustomError` constructor — sets the correct subclass name on every instance at construction time, before the `Object.setPrototypeOf` call. All subclasses (`NotFoundError`, `AuthError`, `ConflictError`, `ValidationError`) now log their real class name. ([be3ed87](../../.git/refs/heads/fix/monitor-custom-error-name))
