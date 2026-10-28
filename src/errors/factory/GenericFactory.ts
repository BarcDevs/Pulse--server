import { ErrorCodes } from '../../constants/errorCodes'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { ConflictError } from '../ConflictError'
import { NotFoundError } from '../NotFoundError'
import { TooManyRequestsError } from '../TooManyRequestsError'

export class GenericFactory {
    static notFound = (object?: string) =>
        new NotFoundError(
            `${object} not found! please check your inputs and try again!`,
            ErrorCodes.NOT_FOUND,
            undefined,
            'Not Found',
            HttpStatusCodes.NOT_FOUND,
            object ? { resource: object } : undefined
        )

    static conflict = (message?: string) =>
        new ConflictError(
            message ?? 'Resource conflict',
            ErrorCodes.CONFLICT
        )

    static tooManyRequests = (message: string) =>
        new TooManyRequestsError(
            message,
            ErrorCodes.TOO_MANY_REQUESTS
        )
}
