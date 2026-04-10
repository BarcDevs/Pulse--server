import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { AuthError } from '../AuthError'
import {
    ConflictError
} from '../ConflictError'

export class AuthFactory {
    static generic = (message?: string) =>
        new AuthError(message ?? 'An error occurred! Please try again.')

    static credentials = (message?: string) =>
        new AuthError(
            message ?? 'Invalid credentials! please try again!',
            undefined,
            'Authentication Error',
            HttpStatusCodes.UNAUTHORIZED
        )

    static unauthorized = (message?: string) =>
        new AuthError(
            `Unauthorized! ${message ?? 'please login first!'}`,
            undefined,
            'Unauthorized',
            HttpStatusCodes.UNAUTHORIZED
        )

    static forbidden = (message?: string) =>
        new AuthError(
            `Forbidden! ${message ?? 'please login first!'}`,
            undefined,
            'Forbidden',
            HttpStatusCodes.FORBIDDEN
        )

    static resetPassword = (message?: string) =>
        new AuthError(
            `Could not reset password! ${message ?? 'please try again!'}`,
            undefined,
            'Reset Password'
        )

    static conflict = (message: string) =>
        new ConflictError(message)
}
