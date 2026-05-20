import type {
    NextFunction,
    Request,
    Response
} from 'express'
import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'blockquote',
    'pre',
    'code',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'span'
]

type AllowedAttributes = sanitizeHtml.IOptions['allowedAttributes']
type AllowedStyles = sanitizeHtml.IOptions['allowedStyles']
type AllowedSchemes = sanitizeHtml.IOptions['allowedSchemesByTag']

const ALLOWED_ATTRIBUTES: AllowedAttributes = {
    a: [
        'href',
        'target',
        'rel'
    ],
    img: [
        'src',
        'alt',
        'width',
        'height'
    ],
    span: ['style']
}

const ALLOWED_STYLES: AllowedStyles = {
    span: {
        color: [
            /^#[0-9a-fA-F]{3,6}$/,
            /^rgb\(\d+,\s*\d+,\s*\d+\)$/
        ],
        'background-color': [
            /^#[0-9a-fA-F]{3,6}$/,
            /^rgb\(\d+,\s*\d+,\s*\d+\)$/
        ],
        'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/]
    }
}

const ALLOWED_SCHEMES: AllowedSchemes = {
    img: ['https'],
    a: ['https', 'mailto']
}

const sanitizeString = (str: string): string =>
    sanitizeHtml(str, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedStyles: ALLOWED_STYLES,
        allowedSchemesByTag: ALLOWED_SCHEMES,
        transformTags: {
            a: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...attribs,
                    ...(attribs.target === '_blank'
                        ? { rel: 'noopener noreferrer' }
                        : {})
                }
            })
        }
    })

const extractCsrfToken = (req: Request) => {
    const { csrfToken } = req.body

    if (csrfToken) req.csrfToken = csrfToken
}

const sanitize = (data: unknown): unknown => {
    if (data === null || data === undefined) return data
    if (typeof data === 'string') return sanitizeString(data)
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

    extractCsrfToken(req)

    Object.keys(req.body).forEach((key) => {
        if (key !== 'csrfToken') req.body[key] = sanitize(req.body[key])
    })

    return next()
}
