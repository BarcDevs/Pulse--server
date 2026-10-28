import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { CustomError } from '../../errors/CustomError'
import { createTooManyRequestsHandler } from '../../utils/tooManyRequestsHandler'

const message = 'Too many things, please try again later'

const callHandler = () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const next = jest.fn()
    const handler = createTooManyRequestsHandler(message)

    handler({} as never, { status } as never, next, {} as never)

    return { status, json, next }
}

describe('createTooManyRequestsHandler', () => {
    it('forwards a 429 CustomError with the message to next', () => {
        const { next } = callHandler()

        expect(next).toHaveBeenCalledTimes(1)
        const error = next.mock.calls[0][0]
        expect(error).toBeInstanceOf(CustomError)
        expect(error.statusCode)
            .toBe(HttpStatusCodes.TOO_MANY_REQUESTS)
        expect(error.message).toBe(message)
    })

    it('leaves the response to errorHandler', () => {
        const { status, json } = callHandler()

        expect(status).not.toHaveBeenCalled()
        expect(json).not.toHaveBeenCalled()
    })
})
