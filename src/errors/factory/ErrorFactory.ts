import { AuthFactory } from './AuthFactory'
import { GenericFactory } from './GenericFactory'
import { ValidationFactory } from './ValidationFactory'

export class ErrorFactory {
    auth = AuthFactory

    validation = ValidationFactory

    generic = GenericFactory

    static GenericError(message: string) {
        return new Error(message)
    }
}

export const errorFactory = new ErrorFactory()
