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
jest.mock('../../utils/PrismaClient', () => ({
    __esModule: true,
    default: prismaMock
}))

// Setup email sender mock
jest.mock('../../utils/emailSender', () => ({
    __esModule: true,
    sendEmail: jest.fn()
}))

// Mock jsdom to avoid ESM issues
jest.mock('jsdom', () => ({
    JSDOM: jest.fn(() => ({
        window: {
            document: {},
            location: {},
            navigator: {}
        }
    }))
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
