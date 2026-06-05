import Prisma from '../../../utils/prismaClient'

jest.mock('../../../utils/emailSender', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}))

jest.mock('../../../middlewares/rateLimiting', () => ({
    rateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    otpRateLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next())
}))

afterEach(async () => {
    await Prisma.$executeRaw`TRUNCATE TABLE "User", "Tag", "UnknownTagAttempt" CASCADE`
})

afterAll(async () => {
    await Prisma.$disconnect()
})
