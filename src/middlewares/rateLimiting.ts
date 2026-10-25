import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { isDev, serverConfig } from '../../config'
import { supportReaderRateLimitKey } from '../constants/support/supportTickets'
import {
    dayInMs,
    hourInMs,
    minuteInMs
} from '../constants/time'
import { createTooManyRequestsHandler } from '../utils/tooManyRequestsHandler'

export const rateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: 300, // Limit each IP to 300 requests per 15 minutes (~20 req/sec)
    handler: createTooManyRequestsHandler(
        'Too many requests from this IP, please try again after 15 minutes'
    ),
    skip: (req) => {
        // Exempt auth infrastructure endpoints from rate limiting
        return req.path === `/api/${serverConfig.apiVersion}/auth/me`
            || req.path === `/api/${serverConfig.apiVersion}/auth/refresh`
    }
})

// One bucket per OTP route, so traffic on one flow (e.g. requesting reset
// codes) can't exhaust the attempts another flow needs, and each route's
// limit means what it says
const createOtpRateLimiter = () => rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(
        'Too many OTP requests from this IP, please try again after 15 minutes'
    )
})

export const confirmEmailRateLimiter = createOtpRateLimiter()
export const forgotPasswordRateLimiter = createOtpRateLimiter()
export const verifyResetCodeRateLimiter = createOtpRateLimiter()
export const resetPasswordRateLimiter = createOtpRateLimiter()
export const changeEmailRateLimiter = createOtpRateLimiter()
export const confirmEmailChangeRateLimiter = createOtpRateLimiter()

// Stops mass account creation / email squatting from one IP
export const signupRateLimiter = rateLimit({
    windowMs: hourInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(
        'Too many sign-up attempts from this IP, please try again in an hour'
    )
})

// Keyed by user so a stolen session can't brute-force the current password
// from rotating IPs. Runs after isAuthenticated, which sets req.userId
export const passwordChangeRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(
        'Too many password change attempts, please try again after 15 minutes'
    )
})

// Each request emails a code, so cap it per user
export const deleteAccountCodeRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(
        'Too many account deletion codes requested, please try again after 15 minutes'
    )
})

export const loginRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 10,
    handler: createTooManyRequestsHandler(
        'Too many login attempts, please try again after 15 minutes'
    ),
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip ?? '')
        const email = String(req.body?.email ?? '').toLowerCase()
        return `${ip}:${email}`
    }
})

const supportRateLimitMessage =
    'Too many support messages, please try again after 15 minutes'

export const supportRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(supportRateLimitMessage)
})

const checkInMutationRateLimitMessage =
    'You have reached today\'s check-in update limit, please try again tomorrow'

export const checkInMutationRateLimiter = rateLimit({
    windowMs: dayInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(checkInMutationRateLimitMessage)
})

export const sharePostRateLimiter = rateLimit({
    windowMs: hourInMs,
    limit: 1,
    handler: createTooManyRequestsHandler(
        'You can only share this post once per hour'
    ),
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip ?? '')
        const postId = req.params.postId
        return `${ip}:${postId}`
    }
})

// A counted view needs 24h since the last one, so one request per hour per
// profile and post loses nothing; it only absorbs retries and repeated opens.
export const viewPostRateLimiter = rateLimit({
    windowMs: hourInMs,
    limit: 1,
    handler: createTooManyRequestsHandler(
        'This view was already recorded'
    ),
    keyGenerator: (req) => {
        const user = req.userId ?? ipKeyGenerator(req.ip ?? '')
        const postId = req.params.postId
        return `${user}:${postId}`
    }
})

// Public, unauthenticated write: caps token spam from one IP
export const launchFunnelOpenRateLimiter = rateLimit({
    windowMs: hourInMs,
    limit: isDev ? 100 : 30,
    handler: createTooManyRequestsHandler(
        'Too many requests from this IP, please try again in an hour'
    )
})

const supportReaderRateLimitMessage =
    'Too many support ticket reads, please try again after 15 minutes'

const supportReaderFailedAuthMessage =
    'Too many failed support reader attempts, please try again after 15 minutes'

// Runs before supportReaderAuth and counts only its failures (401), per IP,
// so junk requests are throttled without touching the reader's bucket
export const supportReaderFailedAuthLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 10,
    skipSuccessfulRequests: true,
    handler: createTooManyRequestsHandler(supportReaderFailedAuthMessage)
})

// One shared bucket for the single Claude reader credential, behind
// supportReaderAuth so only valid reads spend it. Separate from the public
// contact form limiter so neither can exhaust the other
export const supportReaderRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 30,
    keyGenerator: () => supportReaderRateLimitKey,
    handler: createTooManyRequestsHandler(supportReaderRateLimitMessage)
})
