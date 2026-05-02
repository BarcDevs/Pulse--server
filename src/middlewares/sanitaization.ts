import type {
    NextFunction,
    Request,
    Response
} from 'express'

const removeHtmlTags = (str: string): string =>
    str.replace(/<[^>]*>/g, '')

const extractCsrfToken = (req: Request) => {
    const { csrfToken } = req.body

    if (csrfToken) req.csrfToken = csrfToken
}

const sanitize = (data: unknown): unknown => {
    if (data === null || data === undefined) return data
    if (typeof data === 'string') return removeHtmlTags(data)
    if (typeof data === 'number' || typeof data === 'boolean') return data

    if (Array.isArray(data)) return data.map(sanitize)

    if (typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>).reduce(
            (acc, [key, value]) => {
                acc[key] = sanitize(value)
                return acc
            },
            {} as Record<string, unknown>
        )
    }
    return data
}

export const sanitizeData = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (!req.body) {
        req.body = {}
    }

    Object.keys(req.body).forEach((key) => {
        req.body[key] = sanitize(req.body[key])
    })

    extractCsrfToken(req)

    return next()
}
