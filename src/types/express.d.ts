import 'express'

declare global {
    namespace Express {
        interface Request {
            userId?: string
            isGuest?: boolean
            csrfToken?: string
            requestId?: string
        }
    }
}
