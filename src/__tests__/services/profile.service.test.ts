// @ts-nocheck
import * as profileHelpers from '../../lib/profileHelpers'
import * as forumModel from '../../models/forumModel'
import * as profileModel from '../../models/profileModel'
import {
    getAvailableActivityPreferences,
    getAvailableHealthInterests,
    getProfile,
    updateProfile
} from '../../services/profileService'

jest.mock('../../lib/profileHelpers')
jest.mock('../../models/forumModel')
jest.mock('../../models/profileModel')

const USER_ID = 'user-id-123'
const PROFILE_ID = 'profile-id-123'

const mockProfile = (overrides = {}) => ({
    id: PROFILE_ID,
    userId: USER_ID,
    image: null,
    bio: null,
    location: null,
    timezone: 'UTC',
    healthInterests: [],
    activityPreferences: [],
    ...overrides
})

describe('ProfileService', () => {
    beforeEach(() => jest.clearAllMocks())

    // ==================== getProfile ====================
    describe('getProfile', () => {
        it('returns merged profile and interactions', async () => {
            const profile = mockProfile()
            const interactions = { savedPosts: [], likedPosts: [] }
            jest.spyOn(profileHelpers, 'ensureProfileExists').mockResolvedValue(profile)
            jest.spyOn(forumModel, 'getProfileInteractions').mockResolvedValue(interactions)

            const result = await getProfile(USER_ID)

            expect(result.id).toBe(PROFILE_ID)
            expect(result.savedPosts).toEqual([])
        })

        it('calls ensureProfileExists with userId', async () => {
            jest.spyOn(profileHelpers, 'ensureProfileExists').mockResolvedValue(mockProfile())
            jest.spyOn(forumModel, 'getProfileInteractions').mockResolvedValue({})

            await getProfile(USER_ID)

            expect(profileHelpers.ensureProfileExists).toHaveBeenCalledWith(USER_ID)
        })

        it('calls getProfileInteractions with profileId and includePosts', async () => {
            const profile = mockProfile()
            jest.spyOn(profileHelpers, 'ensureProfileExists').mockResolvedValue(profile)
            jest.spyOn(forumModel, 'getProfileInteractions').mockResolvedValue({})

            await getProfile(USER_ID, true)

            expect(forumModel.getProfileInteractions)
                .toHaveBeenCalledWith(PROFILE_ID, true)
        })

        it('defaults includePosts to false', async () => {
            jest.spyOn(profileHelpers, 'ensureProfileExists').mockResolvedValue(mockProfile())
            jest.spyOn(forumModel, 'getProfileInteractions').mockResolvedValue({})

            await getProfile(USER_ID)

            expect(forumModel.getProfileInteractions)
                .toHaveBeenCalledWith(PROFILE_ID, false)
        })
    })

    // ==================== updateProfile ====================
    describe('updateProfile', () => {
        it('delegates to profileModel.updateProfile', async () => {
            const updatedProfile = mockProfile({ bio: 'Hello' })
            jest.spyOn(profileModel, 'updateProfile').mockResolvedValue(updatedProfile)

            const result = await updateProfile(USER_ID, { bio: 'Hello' })

            expect(profileModel.updateProfile).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ bio: 'Hello' })
            )
            expect(result.bio).toBe('Hello')
        })

        it('converts dateOfBirth string to Date object', async () => {
            jest.spyOn(profileModel, 'updateProfile').mockResolvedValue(mockProfile())

            await updateProfile(USER_ID, { dateOfBirth: '1990-05-15' })

            expect(profileModel.updateProfile).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({ dateOfBirth: new Date('1990-05-15') })
            )
        })

        it('omits dateOfBirth when not provided', async () => {
            jest.spyOn(profileModel, 'updateProfile').mockResolvedValue(mockProfile())

            await updateProfile(USER_ID, { bio: 'Test' })

            const callArg = (profileModel.updateProfile as jest.Mock).mock.calls[0][1]
            expect(callArg).not.toHaveProperty('dateOfBirth')
        })

        it('passes healthInterests and activityPreferences through', async () => {
            jest.spyOn(profileModel, 'updateProfile').mockResolvedValue(mockProfile())

            await updateProfile(USER_ID, {
                healthInterests: ['mental-health'],
                activityPreferences: ['yoga']
            })

            expect(profileModel.updateProfile).toHaveBeenCalledWith(
                USER_ID,
                expect.objectContaining({
                    healthInterests: ['mental-health'],
                    activityPreferences: ['yoga']
                })
            )
        })
    })

    // ==================== getAvailableHealthInterests ====================
    describe('getAvailableHealthInterests', () => {
        it('delegates to profileModel', async () => {
            const interests = [{ id: '1', slug: 'mental-health', name: 'Mental Health' }]
            jest.spyOn(profileModel, 'getAvailableHealthInterests').mockResolvedValue(interests)

            const result = await getAvailableHealthInterests()

            expect(result).toEqual(interests)
        })
    })

    // ==================== getAvailableActivityPreferences ====================
    describe('getAvailableActivityPreferences', () => {
        it('delegates to profileModel', async () => {
            const prefs = [{ id: '1', slug: 'yoga', name: 'Yoga' }]
            jest.spyOn(profileModel, 'getAvailableActivityPreferences').mockResolvedValue(prefs)

            const result = await getAvailableActivityPreferences()

            expect(result).toEqual(prefs)
        })
    })
})
