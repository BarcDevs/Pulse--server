import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { createTooManyRequestsHandler } from '../../utils/tooManyRequestsHandler'

const message = 'Too many things, please try again later'

const callHandler = () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const handler = createTooManyRequestsHandler(message)

    handler({} as never, { status } as never, jest.fn(), {} as never)

    return { status, json }
}

describe('createTooManyRequestsHandler', () => {
    it('responds with status 429', () => {
        const { status } = callHandler()

        expect(status).toHaveBeenCalledWith(
            HttpStatusCodes.TOO_MANY_REQUESTS
        )
    })

    it('responds with the message and error array', () => {
        const { json } = callHandler()

        expect(json).toHaveBeenCalledWith({
            message,
            error: [
                {
                    statusType: 'Too Many Requests',
                    statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
                    error: message
                }
            ]
        })
    })
})
