// @ts-nocheck
import * as recommendationsModel from '../../models/recommendationsModel'
import { prismaMock } from '../setup/jestSetup'

jest.mock('../../models/queries/postQuery', () => ({
    postInclude: jest.fn(() => ({}))
}))

const mockItems = [
    { postId: 'post-1', score: 0.9, reason: 'tag match' }
]

const mockSnapshot = {
    id: 'rec-1',
    userId: 'user-1',
    checkInId: 'checkin-1',
    items: mockItems,
    generatedAt: new Date('2026-01-01'),
    generationPending: false,
    pendingSince: null,
    checkIn: { id: 'checkin-1' }
}

describe('recommendationsModel', () => {
    describe('saveSnapshot', () => {
        it('upserts snapshot with correct create payload', async () => {
            prismaMock.postRecommendation.upsert.mockResolvedValue(mockSnapshot)

            await recommendationsModel.saveSnapshot('user-1', 'checkin-1', mockItems)

            expect(prismaMock.postRecommendation.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { checkInId: 'checkin-1' },
                    create: expect.objectContaining({
                        userId: 'user-1',
                        checkInId: 'checkin-1',
                        items: mockItems,
                        generationPending: false
                    }),
                    update: expect.objectContaining({
                        items: mockItems,
                        generationPending: false,
                        pendingSince: null
                    })
                })
            )
        })

        it('saves snapshot with empty items array', async () => {
            prismaMock.postRecommendation.upsert.mockResolvedValue({
                ...mockSnapshot,
                items: []
            })

            await recommendationsModel.saveSnapshot('user-1', 'checkin-1', [])

            const call = prismaMock.postRecommendation.upsert.mock.calls[0][0]
            expect(call.create.items).toEqual([])
        })

        it('propagates Prisma error', async () => {
            prismaMock.postRecommendation.upsert.mockRejectedValue(new Error('DB write failed'))

            await expect(
                recommendationsModel.saveSnapshot('user-1', 'checkin-1', mockItems)
            ).rejects.toThrow('DB write failed')
        })
    })

    describe('getLatestSnapshot', () => {
        it('returns snapshot DTO when found', async () => {
            prismaMock.postRecommendation.findFirst.mockResolvedValue(mockSnapshot)

            const result = await recommendationsModel.getLatestSnapshot('user-1')

            expect(result).toEqual({
                items: mockItems,
                generatedAt: mockSnapshot.generatedAt,
                basedOnCheckInId: 'checkin-1'
            })
        })

        it('returns null when no snapshot exists', async () => {
            prismaMock.postRecommendation.findFirst.mockResolvedValue(null)

            const result = await recommendationsModel.getLatestSnapshot('user-1')

            expect(result).toBeNull()
        })

        it('orders by generatedAt desc', async () => {
            prismaMock.postRecommendation.findFirst.mockResolvedValue(mockSnapshot)

            await recommendationsModel.getLatestSnapshot('user-1')

            expect(prismaMock.postRecommendation.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user-1' },
                    orderBy: { generatedAt: 'desc' }
                })
            )
        })

        it('propagates Prisma error', async () => {
            prismaMock.postRecommendation.findFirst.mockRejectedValue(new Error('timeout'))

            await expect(
                recommendationsModel.getLatestSnapshot('user-1')
            ).rejects.toThrow('timeout')
        })
    })

    describe('getSnapshotWithFlags', () => {
        it('returns snapshot + flags when record exists', async () => {
            prismaMock.postRecommendation.findUnique.mockResolvedValue(mockSnapshot)

            const result = await recommendationsModel.getSnapshotWithFlags('checkin-1')

            expect(result).toEqual({
                snapshot: {
                    items: mockItems,
                    generatedAt: mockSnapshot.generatedAt,
                    basedOnCheckInId: 'checkin-1'
                },
                generationPending: false,
                pendingSince: null
            })
        })

        it('returns null snapshot and pending=false when not found', async () => {
            prismaMock.postRecommendation.findUnique.mockResolvedValue(null)

            const result = await recommendationsModel.getSnapshotWithFlags('missing')

            expect(result).toEqual({
                snapshot: null,
                generationPending: false,
                pendingSince: null
            })
        })

        it('returns generationPending=true and pendingSince when pending', async () => {
            const pending = {
                ...mockSnapshot,
                generationPending: true,
                pendingSince: new Date('2026-01-02')
            }
            prismaMock.postRecommendation.findUnique.mockResolvedValue(pending)

            const result = await recommendationsModel.getSnapshotWithFlags('checkin-1')

            expect(result.generationPending).toBe(true)
            expect(result.pendingSince).toEqual(new Date('2026-01-02'))
        })

        it('propagates Prisma error', async () => {
            prismaMock.postRecommendation.findUnique.mockRejectedValue(new Error('DB down'))

            await expect(
                recommendationsModel.getSnapshotWithFlags('checkin-1')
            ).rejects.toThrow('DB down')
        })
    })

    describe('setPendingGeneration', () => {
        it('upserts with generationPending=true', async () => {
            prismaMock.postRecommendation.upsert.mockResolvedValue({
                ...mockSnapshot,
                generationPending: true
            })

            await recommendationsModel.setPendingGeneration('user-1', 'checkin-1')

            expect(prismaMock.postRecommendation.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { checkInId: 'checkin-1' },
                    create: expect.objectContaining({
                        generationPending: true,
                        items: []
                    }),
                    update: expect.objectContaining({
                        generationPending: true
                    })
                })
            )
        })

        it('propagates Prisma error', async () => {
            prismaMock.postRecommendation.upsert.mockRejectedValue(new Error('upsert fail'))

            await expect(
                recommendationsModel.setPendingGeneration('user-1', 'checkin-1')
            ).rejects.toThrow('upsert fail')
        })
    })

    describe('getCandidatePosts', () => {
        const mockPost = {
            id: 'post-1',
            title: 'Health tips',
            category: 'wellness',
            tags: []
        }

        it('returns posts matching filters', async () => {
            prismaMock.post.findMany.mockResolvedValue([mockPost])

            const result = await recommendationsModel.getCandidatePosts(
                ['wellness'],
                ['health'],
                ['tips']
            )

            expect(prismaMock.post.findMany).toHaveBeenCalled()
            expect(result).toHaveLength(1)
        })

        it('returns all active posts when all filters empty', async () => {
            prismaMock.post.findMany.mockResolvedValue([mockPost])

            await recommendationsModel.getCandidatePosts([], [], [])

            const call = prismaMock.post.findMany.mock.calls[0][0]
            expect(call.where).not.toHaveProperty('OR')
        })

        it('uses default limit=50', async () => {
            prismaMock.post.findMany.mockResolvedValue([])

            await recommendationsModel.getCandidatePosts([], [], [])

            expect(prismaMock.post.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 50 })
            )
        })

        it('uses custom limit', async () => {
            prismaMock.post.findMany.mockResolvedValue([])

            await recommendationsModel.getCandidatePosts([], [], [], 10)

            expect(prismaMock.post.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10 })
            )
        })

        it('returns empty array when no candidates', async () => {
            prismaMock.post.findMany.mockResolvedValue([])

            const result = await recommendationsModel.getCandidatePosts(
                ['rare-category'],
                [],
                []
            )

            expect(result).toEqual([])
        })

        it('propagates Prisma error', async () => {
            prismaMock.post.findMany.mockRejectedValue(new Error('query failed'))

            await expect(
                recommendationsModel.getCandidatePosts(['wellness'], [], [])
            ).rejects.toThrow('query failed')
        })
    })
})
