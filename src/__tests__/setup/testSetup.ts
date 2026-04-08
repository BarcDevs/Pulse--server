import Csrf from 'csrf'
import type { NextFunction } from 'express'

import {
    createToken,
    hashPassword
} from '../../lib/authCrypto'
import type { PostType } from '../../types/data/PostType'
import type {
    MilestoneType,
    RecoveryGoalType
} from '../../types/data/RecoveryGoalType'
import type { ReplyType } from '../../types/data/ReplyType'
import type { TagType } from '../../types/data/TagType'
import type { ServerUserType } from '../../types/data/UserType'

// Re-export prismaMock from jestSetup for backward compatibility
export { prismaMock } from './jestSetup'

// ==================== TEST TYPES ====================
export type MockRequest = {
    body?: Record<string, unknown>
    cookies?: Record<string, string>
    params?: Record<string, string>
    query?: Record<string, string>
    userId?: string
    csrfToken?: string
    method?: string
    originalUrl?: string
    ip?: string
}

export type MockResponse = {
    status: jest.Mock
    json: jest.Mock
    clearCookie: jest.Mock
    cookie?: jest.Mock
    setHeader?: jest.Mock
    send?: jest.Mock
}

// ==================== CSRF HELPERS ====================
const csrfProtection = new Csrf()

export const generateCsrfTokenPair = (): {
    csrfSecret: string
    csrfToken: string
} => {
    const csrfSecret = csrfProtection.secretSync()
    const csrfToken = csrfProtection.create(csrfSecret)
    return { csrfSecret, csrfToken }
}

// ==================== MOCK DATA FACTORIES ====================
export const createMockUser = (
    overrides?: Partial<ServerUserType>
): ServerUserType => ({
    id: 'test-user-id-123',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    email: 'test@test.com',
    role: 'USER',
    password: hashPassword('Password123!'),
    resetPasswordOTP: undefined,
    resetPasswordExpiration: undefined,
    passwordUpdatedAt: new Date(),
    createdAt: new Date(),
    active: true,
    deletedAt: undefined,
    ...overrides
})

export const createMockPost = (
    overrides?: Partial<PostType>
): PostType => ({
    id: 'test-post-id-123',
    title: 'Test Post Title',
    body: 'Test post body content',
    category: 'general',
    authorId: 'test-user-id-123',
    author: {
        id: 'test-user-id-123',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        email: 'test@test.com',
        role: 'USER'
    },
    votes: {
        upvotedBy: [],
        upvotes: 0
    },
    views: 0,
    createdAt: new Date(),
    updatedAt: undefined,
    tags: [],
    replies: [],
    _count: { replies: 0 },
    ...overrides
})

export const createMockReply = (
    overrides?: Partial<ReplyType>
): ReplyType => ({
    id: 'test-reply-id-123',
    body: 'Test reply content',
    authorId: 'test-user-id-123',
    postId: 'test-post-id-123',
    author: {
        id: 'test-user-id-123',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        email: 'test@test.com',
        role: 'USER'
    },
    votes: {
        upvotedBy: [],
        upvotes: 0
    },
    createdAt: new Date(),
    updatedAt: undefined,
    ...overrides
})

export const createMockRecoveryGoal = (
    overrides?: Partial<RecoveryGoalType>
): RecoveryGoalType => ({
    id: 'test-goal-id-123',
    userId: 'test-user-id-123',
    title: 'Build a consistent sleep schedule',
    description: 'Establish a regular sleep routine',
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

export const createMockMilestone = (
    overrides?: Partial<MilestoneType>
): MilestoneType => ({
    id: 'test-milestone-id-123',
    goalId: 'test-goal-id-123',
    title: 'No screens 1 hour before bed',
    isCompleted: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
})

export const createMockTag = (
    overrides?: Partial<TagType>
): TagType => ({
    id: 'test-tag-id-123',
    name: 'test-tag',
    description: 'A test tag',
    createdAt: new Date(),
    ...overrides
})

// ==================== AUTH HELPERS ====================
export const createAuthToken = (
    user: ServerUserType
): string => createToken(user)

export const createAuthenticatedRequest = (
    user: ServerUserType
) => {
    const token = createToken(user)
    const { csrfSecret, csrfToken } =
        generateCsrfTokenPair()
    return { token, csrfSecret, csrfToken }
}

// Apply CSRF auth headers to a supertest request
export const withCsrfAuth = (
    request: any,
    token: string,
    csrfSecret: string,
    csrfToken: string
) => request
    .set('Cookie', [
        `accessToken=${token}`,
        `_csrf=${csrfSecret}`
    ])
    .set('x-csrf-token', csrfToken)

// Apply only bearer token (no CSRF for read requests)
export const withBearerAuth = (
    request: any,
    token: string
) => request.set('Cookie', [`accessToken=${token}`])

// ==================== EXPRESS MOCK HELPERS ====================
export const createMockRequest = (
    overrides?: Partial<MockRequest>
): MockRequest => ({
    cookies: {},
    body: {},
    params: {},
    query: {},
    ...overrides
})

export const createMockResponse = (): MockResponse => {
    const res: Partial<MockResponse> = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    res.clearCookie = jest.fn().mockReturnThis()
    res.cookie = jest.fn().mockReturnThis()
    res.setHeader = jest.fn().mockReturnThis()
    res.send = jest.fn().mockReturnThis()
    return res as MockResponse
}

export const createMockNext = (): NextFunction =>
    jest.fn() as unknown as NextFunction

// ==================== RE-EXPORTS ====================
export {
    createToken,
    hashPassword
} from '../../services/authService'
