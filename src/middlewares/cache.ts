import type {
    NextFunction,
    Request,
    Response,
    Send
} from 'express'
import NodeCache from 'node-cache'

const cache =
    new NodeCache({
        stdTTL: 60 * 10,
        checkperiod: 80
    })

export const cacheMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.method !== 'GET')
        return next()

    const key = req.originalUrl
    const cachedData = cache.get(key)

    if (cachedData) {
        console.info(`Cache hit for ${key}`)

        const parsedCacheData =
            JSON.parse(cachedData as string)

        return res
            .status(200)
            .json(parsedCacheData)
    }

    const originalSend = res.send

    res.send = (body: Send): Response => {
        console.info(`Cache miss for ${key}`)

        cache.set(key, body)

        return originalSend.call(res, body)
    }

    return next()
}
