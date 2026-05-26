import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { ConflictError } from '../ConflictError'
import { NotFoundError } from '../NotFoundError'

export class GenericFactory {
    static notFound = (object?: string) =>
        new NotFoundError(
            `${object} not found! please check your inputs and try again!`,
            undefined,
            'Not Found',
            HttpStatusCodes.NOT_FOUND
        )

    static conflict = (message?: string) =>
        new ConflictError(
            message ?? 'Resource conflict'
        )
}
