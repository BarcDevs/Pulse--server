import { ValidationError } from '../ValidationError'

export class ValidationFactory {
    static generic = (message: string, property?: string) =>
        new ValidationError(message, property)

    static otpError = (message?: string) =>
        new ValidationError(message ?? 'OTP is not valid!', 'OTP')
}
