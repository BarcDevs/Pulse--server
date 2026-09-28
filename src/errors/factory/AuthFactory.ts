import { ErrorCodes } from '../../constants/errorCodes'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { AuthError } from '../AuthError'
import {
    ConflictError
} from '../ConflictError'

export class AuthFactory {
    static generic = (message?: string) =>
        new AuthError(
            message ?? 'An error occurred! Please try again.',
            ErrorCodes.AUTH_GENERIC
        )

    static credentials = (message?: string) =>
        new AuthError(
            message ?? 'Invalid credentials! please try again!',
            ErrorCodes.AUTH_CREDENTIALS,
            undefined,
            'Authentication Error',
            HttpStatusCodes.UNAUTHORIZED
        )

    static unauthorized = (message?: string) =>
        new AuthError(
            `Unauthorized! ${message ?? 'please login first!'}`,
            ErrorCodes.AUTH_UNAUTHORIZED,
            undefined,
            'Unauthorized',
            HttpStatusCodes.UNAUTHORIZED
        )

    static forbidden = (message?: string) =>
        new AuthError(
            `Forbidden! ${message ?? 'please login first!'}`,
            ErrorCodes.AUTH_FORBIDDEN,
            undefined,
            'Forbidden',
            HttpStatusCodes.FORBIDDEN
        )

    static resetPassword = (message?: string) =>
        new AuthError(
            `Could not reset password! ${message ?? 'please try again!'}`,
            ErrorCodes.AUTH_RESET_PASSWORD,
            undefined,
            'Reset Password',
            HttpStatusCodes.BAD_REQUEST
        )

    static conflict = (message: string) =>
        new ConflictError(message, ErrorCodes.AUTH_CONFLICT)
}
