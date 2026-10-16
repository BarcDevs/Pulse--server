import type { NextFunction } from 'express'

const passThrough = (
    _req: unknown,
    _res: unknown,
    next: NextFunction
) => next()

// Every export of rateLimiting becomes a pass-through, so a new limiter
// never needs adding to a hand-kept list
export const createRateLimitingMock = () =>
    Object.fromEntries(
        Object.keys(
            jest.requireActual('../../middlewares/rateLimiting')
        ).map(name => [name, jest.fn(passThrough)])
    )
