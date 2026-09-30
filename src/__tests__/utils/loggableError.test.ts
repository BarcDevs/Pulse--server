import { Prisma } from '../../../prisma/generated/prisma/client'
import { toLoggableError } from '../../utils/loggableError'

const SECRET_ARG = 'victim@example.com'

describe('toLoggableError', () => {
    it(
        'keeps only name, code and model for known Prisma errors',
        () => {
            const err = new Prisma.PrismaClientKnownRequestError(
                `Unique constraint failed: Key (email)=(${SECRET_ARG})`,
                {
                    code: 'P2002',
                    clientVersion: 'test',
                    meta: {
                        modelName: 'User',
                        target: [SECRET_ARG]
                    }
                }
            )

            const result = toLoggableError(err)

            expect(result).toEqual({
                name: 'PrismaClientKnownRequestError',
                code: 'P2002',
                model: 'User'
            })
            expect(JSON.stringify(result)).not.toContain(SECRET_ARG)
        }
    )

    it(
        'drops the message of Prisma validation errors, which prints query args',
        () => {
            const err = new Prisma.PrismaClientValidationError(
                `Invalid prisma.user.create() invocation: { email: "${SECRET_ARG}" }`,
                { clientVersion: 'test' }
            )

            const result = toLoggableError(err)

            expect(result.name).toBe('PrismaClientValidationError')
            expect(JSON.stringify(result)).not.toContain(SECRET_ARG)
        }
    )

    it(
        'keeps message and stack for non-Prisma errors',
        () => {
            const err = new Error('boom')

            const result = toLoggableError(err)

            expect(result).toEqual({
                name: 'Error',
                message: 'boom',
                stack: err.stack
            })
        }
    )

    it(
        'stringifies non-Error values',
        () => {
            expect(toLoggableError('oops')).toEqual({ error: 'oops' })
        }
    )
})
