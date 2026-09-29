import { ErrorCodes } from '../../constants/errorCodes'
import { ValidationError } from '../ValidationError'

export class ValidationFactory {
    static generic = (message: string, property?: string) =>
        new ValidationError(message, ErrorCodes.VALIDATION_GENERIC, property)

    static otpError = (message?: string) =>
        new ValidationError(
            message ?? 'OTP is not valid!',
            ErrorCodes.VALIDATION_OTP,
            'OTP'
        )
}
