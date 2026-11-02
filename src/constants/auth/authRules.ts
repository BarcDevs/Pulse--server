export const SESSION_EXPIRES_IN = '1d'

export const ACCOUNT_DELETION_GRACE_DAYS = 30

export const GUEST_CHECK_IN_LIMIT = 3

// A guest is kept for the token lifetime (config) plus this grace, see
// guestRetentionService
export const GUEST_RETENTION_GRACE_DAYS = 1

export const GUEST_PURGE_BATCH_SIZE = 500

export const GUEST_PLACEHOLDER_NAME = 'Guest'

export const GUEST_USERNAME_PREFIX = 'guest_'

export const GUEST_ID_LENGTH = 12

// .invalid never resolves, so no mail can reach a guest placeholder address
export const GUEST_EMAIL_DOMAIN = 'guest.invalid'

export const INVALID_EMAIL_TLD = '.invalid'

export const GUEST_FORBIDDEN_MESSAGE =
    'Create an account to use this feature'

export const GUEST_CHECK_IN_LIMIT_MESSAGE =
    'Guest check-in limit reached. Create an account to continue.'

export const ALREADY_SIGNED_IN_MESSAGE = 'Already signed in!'

export const GUEST_ONLY_UPGRADE_MESSAGE =
    'Only guest accounts can be upgraded'

export const EMAIL_TAKEN_MESSAGE = 'User already exists!'

export const USERNAME_TAKEN_MESSAGE = 'Username already taken!'

export const MAX_RESET_PASSWORD_ATTEMPTS = 5

export const MAX_CONFIRM_EMAIL_ATTEMPTS = 5

export const MAX_EMAIL_CHANGE_ATTEMPTS = 5

export const MAX_DELETE_ACCOUNT_ATTEMPTS = 5

// bcrypt hash of a random secret that was thrown away: a guest has no
// password, and hashing a fresh one per guest would burn CPU on an open route
export const GUEST_PASSWORD_HASH =
    '$2b$12$fWYi0UlXIz6akgkxvcfg1OSsAWZ8TyzXy0RNFCbg5N/BXES1.QEUa'

export const DUMMY_PASSWORD_HASH =
    '$2b$12$97sk6HyELQeZ4TF0J9siruAQTp2HXBTjFVZrSd1zhjy0C50KfpSxu'