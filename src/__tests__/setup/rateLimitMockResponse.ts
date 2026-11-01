import { EventEmitter } from 'events'
import type { Response } from 'express'

import { HttpStatusCodes } from '../../constants/httpStatusCodes'

export const createRateLimitMockResponse = () => {
    const headers: Record<string, unknown> = {}
    return Object.assign(new EventEmitter(), {
        statusCode: HttpStatusCodes.OK,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn((key: string, value: unknown) => {
            headers[key] = value
        }),
        getHeader: jest.fn((key: string) => headers[key]),
        removeHeader: jest.fn((key: string) => {
            delete headers[key]
        }),
        headersSent: false
    }) as unknown as Response
}
