import Prisma from '../../../utils/prismaClient'

jest.mock('../../../utils/emailSender', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}))

jest.mock('../../../middlewares/rateLimiting', () =>
    require('../../setup/mockRateLimiting').createRateLimitingMock()
)

afterEach(async () => {
    await Prisma.$executeRaw`TRUNCATE TABLE "User", "Tag", "UnknownTagAttempt", "SupportTicket" CASCADE`
})

afterAll(async () => {
    await Prisma.$disconnect()
})
