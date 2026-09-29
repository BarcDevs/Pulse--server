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

export const otpRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 5,
    message:
        'Too many OTP requests from this IP, please try again after 15 minutes'
})

export const loginRateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: isDev ? 100 : 10,
    message:
        'Too many login attempts, please try again after 15 minutes',
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip ?? '')
        const email = req.body?.email ?? ''
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
