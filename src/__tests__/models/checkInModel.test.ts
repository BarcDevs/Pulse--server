// @ts-nocheck
import * as checkInModel from '../../models/checkInModel'
import { prismaMock } from '../setup/jestSetup'

jest.mock('../../errors/factory/ErrorFactory', () => ({
    errorFactory: {
        generic: {
            notFound: jest.fn((name) => new Error(`${name} not found`))
        }
    }
}))

const mockProfile = { id: 'profile-id', userId: 'user-id', timezone: 'UTC' }
const mockCheckIn = {
    id: 'checkin-id',
    profileId: 'profile-id',
    checkInDate: new Date('2026-01-01'),
    moodScore: 7,
    painLevel: 3,
    activities: [],
    insights: []
}

describe('CheckInModel', () => {
    describe('getProfileIdForUser', () => {
        it('returns profile id when found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(mockProfile)

            const result = await checkInModel.getProfileIdForUser('user-id')

            expect(result).toBe('profile-id')
        })

        it('throws when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            await expect(
                checkInModel.getProfileIdForUser('user-id')
            ).rejects.toThrow()
        })
    })

    describe('getProfileContext', () => {
        it('returns id and timezone when profile found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(mockProfile)

            const result = await checkInModel.getProfileContext('user-id')

            expect(result.id).toBe('profile-id')
            expect(result.timezone).toBe('UTC')
        })

        it('throws when profile not found', async () => {
            prismaMock.profile.findUnique.mockResolvedValue(null)

            await expect(
                checkInModel.getProfileContext('user-id')
            ).rejects.toThrow()
        })
    })

    describe('getCheckIns', () => {
        it('queries by profileId and returns results', async () => {
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([mockCheckIn])

            const result = await checkInModel.getCheckIns('profile-id')

            expect(result).toEqual([mockCheckIn])
            expect(prismaMock.dailyCheckIn.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { profileId: 'profile-id' }
                })
            )
        })

        it('uses default limit of 30', async () => {
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([])

            await checkInModel.getCheckIns('profile-id')

            expect(prismaMock.dailyCheckIn.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 30 })
            )
        })
    })

    describe('findCheckInById', () => {
        it('returns check-in when found', async () => {
            prismaMock.dailyCheckIn.findUnique.mockResolvedValue(mockCheckIn)

            const result = await checkInModel.findCheckInById('checkin-id')

            expect(result).toEqual(mockCheckIn)
        })

        it('returns null when not found', async () => {
            prismaMock.dailyCheckIn.findUnique.mockResolvedValue(null)

            const result = await checkInModel.findCheckInById('nonexistent')

            expect(result).toBeNull()
        })
    })

    describe('findTodayCheckIn', () => {
        it('queries with compound unique key', async () => {
            const date = new Date('2026-01-01')
            prismaMock.dailyCheckIn.findUnique.mockResolvedValue(mockCheckIn)

            await checkInModel.findTodayCheckIn('profile-id', date)

            expect(prismaMock.dailyCheckIn.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        profileId_checkInDate: {
                            profileId: 'profile-id',
                            checkInDate: date
                        }
                    }
                })
            )
        })
    })

    describe('createCheckIn', () => {
        it('creates check-in with profileId and checkInDate', async () => {
            prismaMock.dailyCheckIn.create.mockResolvedValue(mockCheckIn)
            const date = new Date('2026-01-01')

            const result = await checkInModel.createCheckIn(
                { userId: 'user-id', moodScore: 7, painLevel: 3, activities: [] },
                'profile-id',
                date
            )

            expect(prismaMock.dailyCheckIn.create).toHaveBeenCalled()
            expect(result).toEqual(mockCheckIn)
        })
    })

    describe('updateCheckIn', () => {
        it('updates using compound unique key', async () => {
            prismaMock.dailyCheckIn.update.mockResolvedValue(mockCheckIn)
            const date = new Date('2026-01-01')

            await checkInModel.updateCheckIn('profile-id', date, { moodScore: 8 })

            expect(prismaMock.dailyCheckIn.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        profileId_checkInDate: {
                            profileId: 'profile-id',
                            checkInDate: date
                        }
                    }
                })
            )
        })
    })

    describe('getCheckInsForStats', () => {
        it('returns check-in data for profile', async () => {
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([mockCheckIn])

            const result = await checkInModel.getCheckInsForStats('profile-id')

            expect(result).toEqual([mockCheckIn])
            expect(prismaMock.dailyCheckIn.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { profileId: 'profile-id' }
                })
            )
        })

        it('applies since filter when provided', async () => {
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([])
            const since = new Date('2026-01-01')

            await checkInModel.getCheckInsForStats('profile-id', since)

            expect(prismaMock.dailyCheckIn.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        checkInDate: { gte: since }
                    })
                })
            )
        })
    })

    describe('getCheckInsForDateRange', () => {
        it('queries within date range', async () => {
            prismaMock.dailyCheckIn.findMany.mockResolvedValue([mockCheckIn])
            const start = new Date('2026-01-01')
            const end = new Date('2026-01-07')

            const result = await checkInModel.getCheckInsForDateRange(
                'profile-id', start, end
            )

            expect(prismaMock.dailyCheckIn.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        profileId: 'profile-id',
                        checkInDate: { gte: start, lte: end }
                    }
                })
            )
            expect(result).toEqual([mockCheckIn])
        })
    })
})
