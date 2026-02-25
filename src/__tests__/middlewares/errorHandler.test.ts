// @ts-nocheck
import type { Request, Response } from 'express'

import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { AuthError } from '../../errors/AuthError'
import { NotFoundError } from '../../errors/NotFoundError'
import { ValidationError } from '../../errors/ValidationError'
import { errorHandler } from '../../middlewares/errorHandler'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

describe('errorHandler Middleware', () => {
    describe('CustomError handling', () => {
        it('should return serialized AuthError with correct status code', () => {
            const error = new AuthError('Unauthorized access!')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.UNAUTHORIZED)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'There was an error',
                    error: expect.arrayContaining([
                        expect.objectContaining({
                            statusType: 'Authentication Error',
                            error: 'Unauthorized access!'
                        })
                    ])
                })
            )
        })

        it('should return serialized ValidationError with correct status code', () => {
            const error = new ValidationError('Invalid email format', 'email')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.FORBIDDEN)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'There was an error',
                    error: expect.arrayContaining([
                        expect.objectContaining({
                            statusType: 'Validation Error',
                            error: 'Invalid email format',
                            property: 'email'
                        })
                    ])
                })
            )
        })

        it('should return serialized NotFoundError with correct status code', () => {
            const error = new NotFoundError('Post not found!', undefined, 'Not Found', HttpStatusCodes.NOT_FOUND)
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.NOT_FOUND)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'There was an error'
                })
            )
        })

        it('should return 401 for unauthorized AuthError', () => {
            const error = new AuthError(
                'Unauthorized!',
                undefined,
                'Unauthorized',
                HttpStatusCodes.UNAUTHORIZED
            )
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.UNAUTHORIZED)
        })

        it('should return 409 for conflict AuthError', () => {
            const error = new AuthError(
                'User already exists!',
                'email',
                'Conflict',
                HttpStatusCodes.CONFLICT
            )
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.CONFLICT)
        })
    })

    describe('Generic Error handling', () => {
        it('should return 500 for generic Error', () => {
            const error = new Error('Something went wrong')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.INTERNAL_SERVER_ERROR)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'There was an error',
                    error: 'Something went wrong'
                })
            )
        })

        it('should return 500 for TypeError', () => {
            const error = new TypeError('Cannot read property of undefined')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.status).toHaveBeenCalledWith(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        })

        it('should call next after handling generic error', () => {
            const error = new Error('Generic error')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(next).toHaveBeenCalled()
        })
    })

    describe('Response format', () => {
        it('should always include message property in response', () => {
            const error = new Error('Test error')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'There was an error'
                })
            )
        })

        it('should include error property in response', () => {
            const error = new Error('Test error')
            const req = createMockRequest() as Request
            const res = createMockResponse() as Response
            const next = createMockNext()

            errorHandler(error, req, res, next)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.anything()
                })
            )
        })
    })
})
