import rateLimit from 'express-rate-limit'

import {minuteInMs} from '../constants/time'

export const rateLimiter = rateLimit({
    windowMs: 15 * minuteInMs,
    limit: 100, // Limit each IP to 100 requests per window (15 minutes)
    message:
        'Too many requests from this IP, please try again after 15 minutes',
})
