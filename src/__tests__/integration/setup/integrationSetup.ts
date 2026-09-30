import Prisma from '../../../utils/prismaClient'

jest.mock('../../../utils/emailSender', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}))

jest.mock('../../../middlewares/rateLimiting', () => ({
    rateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    confirmEmailRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    forgotPasswordRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    verifyResetCodeRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    resetPasswordRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    changeEmailRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    confirmEmailChangeRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    loginRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    signupRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    passwordChangeRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    sharePostRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    supportRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    checkInMutationRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next())
}))

afterEach(async () => {
    await Prisma.$executeRaw`TRUNCATE TABLE "User", "Tag", "UnknownTagAttempt" CASCADE`
})

afterAll(async () => {
    await Prisma.$disconnect()
})
