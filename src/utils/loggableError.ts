import { Prisma } from '../../prisma/generated/prisma/client'

const isPrismaError = (err: unknown): err is Error =>
    err instanceof Prisma.PrismaClientKnownRequestError
    || err instanceof Prisma.PrismaClientUnknownRequestError
    || err instanceof Prisma.PrismaClientValidationError
    || err instanceof Prisma.PrismaClientInitializationError
    || err instanceof Prisma.PrismaClientRustPanicError

/** Prisma messages, stacks and meta can embed query args and row values
 * (emails, notes), so only the error kind and code are logged for them. */
export const toLoggableError = (err: unknown): Record<string, unknown> => {
    if (isPrismaError(err)) {
        return {
            name: err.name,
            code: err instanceof Prisma.PrismaClientKnownRequestError
                ? err.code
                : undefined,
            model: err instanceof Prisma.PrismaClientKnownRequestError
                ? err.meta?.modelName
                : undefined
        }
    }

    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    }

    return { error: String(err) }
}
