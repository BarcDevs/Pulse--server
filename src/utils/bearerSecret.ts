import crypto from 'crypto'

const bearerPrefix = 'Bearer '

const digest = (value: string) =>
    crypto.createHash('sha256').update(value).digest()

// Fails closed: an unset or too-short secret never matches. Hashing first
// gives timingSafeEqual equal-length inputs whatever the caller sent
export const isBearerSecretValid = (
    header: string | undefined,
    secret: string,
    minLength: number
): boolean =>
    secret.length >= minLength
    && !!header?.startsWith(bearerPrefix)
    && crypto.timingSafeEqual(
        digest(header.slice(bearerPrefix.length)),
        digest(secret)
    )
