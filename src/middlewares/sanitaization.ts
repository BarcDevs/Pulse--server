import createDOMPurify from 'dompurify'
import type {
    NextFunction,
    Request,
    Response
} from 'express'
import jsdom from 'jsdom'

const { JSDOM } = jsdom

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

const isBodyEmpty = (req: Request) => Object.keys(req.body).length === 0

const extractCsrfToken = (req: Request) => {
    const { csrfToken } = req.body

    if (csrfToken) req.csrfToken = csrfToken
}

const sanitize = (data: string | object): string | object => {
    if (!data) return data
    if (typeof data === 'string') return DOMPurify.sanitize(data)

    if (Array.isArray(data)) return data.map(sanitize)

    if (typeof data === 'object') {
        return Object.entries(data as Record<string, unknown>).reduce(
            (acc, [key, value]) => {
                acc[key] = sanitize(value as string | object)
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
    Object.keys(req.body).forEach((key) => {
        req.body[key] = sanitize(req.body[key])
    })

    extractCsrfToken(req)

    if (isBodyEmpty(req)) {
        req.body = null
        return next()
    }

    return next()
}
