import { minuteInMs, secondInMs } from './time'

export const CHECK_IN_AI_JOB_POLL_MS = 3 * secondInMs
export const CHECK_IN_AI_JOB_CONCURRENCY = 2
export const CHECK_IN_AI_JOB_MAX_ATTEMPTS = 2
// A failed job waits this long before the next attempt, so a provider outage is not hammered
export const CHECK_IN_AI_JOB_RETRY_DELAY_MS = 10 * secondInMs
// A RUNNING job older than this belongs to a worker that died (restart, crash)
export const CHECK_IN_AI_JOB_STALE_MS = 2 * minuteInMs
// How long a shutdown waits for the job in flight before the database is closed
export const CHECK_IN_AI_JOB_SHUTDOWN_WAIT_MS = 8 * secondInMs
// lastError of a job that stayed RUNNING past the stale timeout with no attempts left
export const CHECK_IN_AI_JOB_STALE_ERROR = 'Stale'
