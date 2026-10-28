import { ErrorCodes } from '../../constants/errorCodes'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { CustomError } from '../../errors/CustomError'
import { errorFactory } from '../../errors/factory/ErrorFactory'

describe('errorFactory.generic.tooManyRequests', () => {
    const message = 'Too many things, please try again later'

    it('builds a CustomError with status 429', () => {
        const error = errorFactory.generic.tooManyRequests(message)

        expect(error).toBeInstanceOf(CustomError)
        expect(error.statusCode)
            .toBe(HttpStatusCodes.TOO_MANY_REQUESTS)
        expect(error.message).toBe(message)
    })

    it('serializes the status type, code and message', () => {
        const error = errorFactory.generic.tooManyRequests(message)

        expect(error.serializeErrors()).toEqual([
            {
                statusType: 'Too Many Requests',
                statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                code: ErrorCodes.TOO_MANY_REQUESTS,
                error: message
            }
        ])
    })
})
