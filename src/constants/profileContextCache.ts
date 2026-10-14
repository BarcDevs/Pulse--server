import { secondInMs } from './time'

// Short on purpose: the server may run on two instances and an update only
// invalidates the instance that handled it.
export const PROFILE_CONTEXT_TTL_MS = 30 * secondInMs

export const PROFILE_CONTEXT_MAX_ENTRIES = 10_000
