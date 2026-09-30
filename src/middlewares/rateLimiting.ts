import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { isDev, serverConfig } from '../../config'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import {
    dayInMs,
    hourInMs,
    minuteInMs
} from '../constants/time'

export const rateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: 300, // Limit each IP to 300 requests per 15 minutes (~20 req/sec)
    message:
        'Too many requests from this IP, please try again after 15 minutes',
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
    message:
        'Too many OTP requests from this IP, please try again after 15 minutes'
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
    message:
        'Too many sign-up attempts from this IP, please try again in an hour'
})

// Keyed by user so a stolen session can't brute-force the current password
// from rotating IPs. Runs after isAuthenticated, which sets req.userId
export const passwordChangeRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    message:
        'Too many password change attempts, please try again after 15 minutes'
})

// Each request emails a code, so cap it per user
export const deleteAccountCodeRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    message:
        'Too many account deletion codes requested, please try again after 15 minutes'
})

export const loginRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 10,
    message:
        'Too many login attempts, please try again after 15 minutes',
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
    handler: (_req, res) => {
        res
            .status(HttpStatusCodes.TOO_MANY_REQUESTS)
            .json({
                message: supportRateLimitMessage,
                error: [
                    {
                        statusType: 'Too Many Requests',
                        statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                        error: supportRateLimitMessage
                    }
                ]
            })
    }
})

const checkInMutationRateLimitMessage =
    'You have reached today\'s check-in update limit, please try again tomorrow'

export const checkInMutationRateLimiter = rateLimit({
    windowMs: dayInMs,
    limit: isDev ? 100 : 5,
    keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
    handler: (_req, res) => {
        res
            .status(HttpStatusCodes.TOO_MANY_REQUESTS)
            .json({
                message: checkInMutationRateLimitMessage,
                error: [
                    {
                        statusType: 'Too Many Requests',
                        statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                        error: checkInMutationRateLimitMessage
                    }
                ]
            })
    }
})

export const sharePostRateLimiter = rateLimit({
    windowMs: hourInMs,
    limit: 1,
    message:
        'You can only share this post once per hour',
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip ?? '')
        const postId = req.params.postId
        return `${ip}:${postId}`
    }
})
