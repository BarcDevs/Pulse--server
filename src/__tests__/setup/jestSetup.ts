import {
    type DeepMockProxy,
    mockDeep,
    mockReset
} from 'jest-mock-extended'

import type { PrismaClient } from '../../../prisma/generated/prisma/client'
import { getSessionState } from '../../models/sessionModel'

// Create the mock instance that will be shared across all tests
export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

// Setup Prisma mock
jest.mock('../../utils/prismaClient', () => ({
    __esModule: true,
    default: prismaMock
}))

// Session lookup mock (isAuthenticated / optionalAuthentication)
jest.mock('../../models/sessionModel', () => ({
    __esModule: true,
    getSessionState: jest.fn()
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
    loginRateLimiter: jest.fn((_req, _res, next) => next()),
    signupRateLimiter: jest.fn((_req, _res, next) => next()),
    sharePostRateLimiter: jest.fn((_req, _res, next) => next()),
    supportRateLimiter: jest.fn((_req, _res, next) => next()),
    checkInMutationRateLimiter: jest.fn((_req, _res, next) => next())
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

    // Every signed test token is a live session unless a test says otherwise
    jest.mocked(getSessionState)
        .mockResolvedValue({
            active: true,
            passwordUpdatedAt: new Date(0)
        })
})

// Clear all mocks after each test
afterEach(() => {
    jest.clearAllMocks()
})

// Disconnect Prisma after all tests
afterAll(async () => {
    await prismaMock.$disconnect()
})
