import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { isDev } from '../../config'
import { hourInMs, minuteInMs } from '../constants/time'

export const rateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: 300, // Limit each IP to 300 requests per 15 minutes (~20 req/sec)
    message:
        'Too many requests from this IP, please try again after 15 minutes',
    skip: (req) => {
        // Exempt auth infrastructure endpoints from rate limiting
        return req.path === '/api/v1/auth/me'
            || req.path === '/api/v1/auth/csrf'
    }
})

export const otpRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    message:
        'Too many OTP requests from this IP, please try again after 15 minutes'
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
