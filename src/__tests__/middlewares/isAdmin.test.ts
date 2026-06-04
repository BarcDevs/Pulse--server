// @ts-nocheck
import type { Response } from 'express'

import { isAdmin } from '../../middlewares/isAdmin'
import { prismaMock } from '../setup/jestSetup'
import {
    createMockNext,
    createMockRequest,
    createMockResponse
} from '../setup/testSetup'

jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        auth: {
            unauthorized: jest.fn(() => new Error('Unauthorized')),
            forbidden: jest.fn(() => new Error('Forbidden'))
        }
    }
}))

describe('isAdmin Middleware', () => {
    it('throws unauthorized when no userId', async () => {
        const req = createMockRequest() as any
        const res = createMockResponse() as Response
        const next = createMockNext()

        await expect(isAdmin(req, res, next)).rejects.toThrow('Unauthorized')
    })

    it('throws forbidden when user not found in DB', async () => {
        const req = createMockRequest({ userId: 'user-id' }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()
        prismaMock.user.findUnique.mockResolvedValue(null)

        await expect(isAdmin(req, res, next)).rejects.toThrow('Forbidden')
    })

    it('throws forbidden when user role is USER', async () => {
        const req = createMockRequest({ userId: 'user-id' }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()
        prismaMock.user.findUnique.mockResolvedValue({ role: 'USER' })

        await expect(isAdmin(req, res, next)).rejects.toThrow('Forbidden')
    })

    it('calls next when user role is ADMIN', async () => {
        const req = createMockRequest({ userId: 'user-id' }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()
        prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' })

        await isAdmin(req, res, next)

        expect(next).toHaveBeenCalled()
    })

    it('queries DB with correct userId', async () => {
        const req = createMockRequest({ userId: 'specific-user-id' }) as any
        const res = createMockResponse() as Response
        const next = createMockNext()
        prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' })

        await isAdmin(req, res, next)

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'specific-user-id' }
            })
        )
    })
})
