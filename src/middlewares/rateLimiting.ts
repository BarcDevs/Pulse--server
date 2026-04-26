import rateLimit from 'express-rate-limit'

import { minuteInMs } from '../constants/time'

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
    limit: 5, // Strict limit: 5 requests per 15 minutes per IP for OTP endpoints
    message:
        'Too many OTP requests from this IP, please try again after 15 minutes'
})
