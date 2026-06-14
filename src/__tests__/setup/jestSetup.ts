// @ts-nocheck
import {
    type DeepMockProxy,
    mockDeep,
    mockReset
} from 'jest-mock-extended'

import type { PrismaClient } from '../../../prisma/generated/prisma/client'

// Create the mock instance that will be shared across all tests
export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

// Setup Prisma mock
jest.mock('../../utils/prismaClient', () => ({
    __esModule: true,
    default: prismaMock
}))

// Setup email sender mock
jest.mock('../../utils/emailSender', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}))


// Mock rate limiters to prevent test requests from hitting limits
jest.mock('../../middlewares/rateLimiting', () => ({
    rateLimiter: jest.fn((_req, _res, next) => next()),
    otpRateLimiter: jest.fn((_req, _res, next) => next()),
    sharePostRateLimiter: jest.fn((_req, _res, next) => next())
}))

// Reset mocks before each test
beforeEach(() => {
    mockReset(prismaMock)

    // Mock $transaction to execute callback with the mock
    prismaMock.$transaction.mockImplementation(
        async (callback) => {
            return callback(prismaMock)
        }
    )
})

// Clear all mocks after each test
afterEach(() => {
    jest.clearAllMocks()
})

// Disconnect Prisma after all tests
afterAll(async () => {
    await prismaMock.$disconnect()
})
