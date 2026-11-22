import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { isDev, serverConfig } from '../../config'
import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/auth/cookieNames'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { supportReaderRateLimitKey } from '../constants/support/supportTickets'
import {
    dayInMs,
    hourInMs,
    minuteInMs
} from '../constants/time'
import { createRateLimitStore } from '../lib/redis/rateLimitStore'
import { getSession } from '../services/authService'
import { createTooManyRequestsHandler } from '../utils/tooManyRequestsHandler'

import { hasValidSupportReaderSecret } from './supportReaderAuth'

export const rateLimiter = rateLimit({
    store: createRateLimitStore('rateLimiter'),
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
const createOtpRateLimiter = (name: string) => rateLimit({
    store: createRateLimitStore(name),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(
        'Too many OTP requests from this IP, please try again after 15 minutes'
    )
})

export const confirmEmailRateLimiter = createOtpRateLimiter('confirmEmailRateLimiter')
export const forgotPasswordRateLimiter = createOtpRateLimiter('forgotPasswordRateLimiter')
export const verifyResetCodeRateLimiter = createOtpRateLimiter('verifyResetCodeRateLimiter')
export const resetPasswordRateLimiter = createOtpRateLimiter('resetPasswordRateLimiter')
export const changeEmailRateLimiter = createOtpRateLimiter('changeEmailRateLimiter')
export const confirmEmailChangeRateLimiter = createOtpRateLimiter('confirmEmailChangeRateLimiter')

// Each guest costs a user row and AI generations, so cap creation per IP.
// A request that carries a live session only reuses a guest (or is refused),
// so it is not counted; a missing or invalid cookie still is, so dropping the
// cookie does not skip the cap
export const guestRateLimiter = rateLimit({
    store: createRateLimitStore('guestRateLimiter'),
    windowMs: hourInMs,
    limit: isDev ? 100 : 10,
    skip: async (req) =>
        !!await getSession(
            req.cookies?.[ACCESS_TOKEN_COOKIE_NAME]
        ),
    handler: createTooManyRequestsHandler(
        'Too many guest sessions from this IP, please try again in an hour'
    )
})

// Stops mass account creation / email squatting from one IP
export const signupRateLimiter = rateLimit({
    store: createRateLimitStore('signupRateLimiter'),
    windowMs: hourInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(
        'Too many sign-up attempts from this IP, please try again in an hour'
    )
})

// Keyed by user so a stolen session can't brute-force the current password
// from rotating IPs. Runs after isAuthenticated, which sets req.userId
export const passwordChangeRateLimiter = rateLimit({
    store: createRateLimitStore('passwordChangeRateLimiter'),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(
        'Too many password change attempts, please try again after 15 minutes'
    )
})

// Each request emails a code, so cap it per user
export const deleteAccountCodeRateLimiter = rateLimit({
    store: createRateLimitStore('deleteAccountCodeRateLimiter'),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(
        'Too many account deletion codes requested, please try again after 15 minutes'
    )
})

export const loginRateLimiter = rateLimit({
    store: createRateLimitStore('loginRateLimiter'),
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
    store: createRateLimitStore('supportRateLimiter'),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    handler: createTooManyRequestsHandler(supportRateLimitMessage)
})

const checkInMutationRateLimitMessage =
    'You have reached today\'s check-in update limit, please try again tomorrow'

export const checkInMutationRateLimiter = rateLimit({
    store: createRateLimitStore('checkInMutationRateLimiter'),
    windowMs: dayInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: createTooManyRequestsHandler(checkInMutationRateLimitMessage)
})

export const sharePostRateLimiter = rateLimit({
    store: createRateLimitStore('sharePostRateLimiter'),
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
    store: createRateLimitStore('viewPostRateLimiter'),
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
    store: createRateLimitStore('launchFunnelOpenRateLimiter'),
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
// so junk requests are throttled without touching the reader's bucket.
// A valid secret skips it, so junk from the reader's shared IP can't lock the
// reader out, and the reader's own 400/500 responses never count
export const supportReaderFailedAuthLimiter = rateLimit({
    store: createRateLimitStore('supportReaderFailedAuthLimiter'),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 10,
    skip: hasValidSupportReaderSecret,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) =>
        res.statusCode !== HttpStatusCodes.UNAUTHORIZED,
    handler: createTooManyRequestsHandler(supportReaderFailedAuthMessage)
})

// One shared bucket for the single Claude reader credential, behind
// supportReaderAuth so only valid reads spend it. Separate from the public
// contact form limiter so neither can exhaust the other
export const supportReaderRateLimiter = rateLimit({
    store: createRateLimitStore('supportReaderRateLimiter'),
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 30,
    keyGenerator: () => supportReaderRateLimitKey,
    handler: createTooManyRequestsHandler(supportReaderRateLimitMessage)
})
