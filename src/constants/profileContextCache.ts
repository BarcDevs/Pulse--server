import { secondInMs } from './time'

// Redis is shared by every instance and an update deletes the key, so this only
// bounds how long a change made outside the server (a database edit) can stay hidden.
export const PROFILE_CONTEXT_TTL_SECONDS = 30
export const PROFILE_CONTEXT_CACHE_KEY_PREFIX = 'profile-context:'
export const PROFILE_CONTEXT_TTL_MS = PROFILE_CONTEXT_TTL_SECONDS * secondInMs
