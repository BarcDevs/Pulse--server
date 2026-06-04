// @ts-nocheck
import * as dailyObservationCache from '../../lib/cache/dailyObservationCache'
import * as dateHelpers from '../../lib/checkInDateHelpers'
import * as observationAiGenerator from '../../lib/dailyObservation/observationAiGenerator'
import * as observationDetectors from '../../lib/dailyObservation/observationDetectors'
import * as observationTemplates from '../../lib/dailyObservation/observationTemplates'
import * as authModel from '../../models/authModel'
import * as checkInModel from '../../models/checkInModel'
import { getTodayObservation } from '../../services/dailyObservationService'

jest.mock('../../lib/cache/dailyObservationCache')
jest.mock('../../lib/checkInDateHelpers')
jest.mock('../../lib/dailyObservation/observationAiGenerator')
jest.mock('../../lib/dailyObservation/observationDetectors')
jest.mock('../../lib/dailyObservation/observationTemplates')
jest.mock('../../models/authModel')
jest.mock('../../models/checkInModel')
jest.mock('../../locales', () => ({
    getMessages: jest.fn().mockReturnValue({
        observation: { title: 'Your Daily Observation' }
    })
}))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))
jest.mock('../../constants/time', () => ({ monthInMs: 2592000000 }))

const USER_ID = 'user-id-123'
const PROFILE_ID = 'profile-id-123'
const TIMEZONE = 'UTC'

const mockCheckIn = (activities: string[] = []) => ({
    id: 'check-in-id',
    profileId: PROFILE_ID,
    moodScore: 7,
    painLevel: 3,
    activities,
    notes: null,
    checkInDate: new Date(),
    createdAt: new Date()
})

const aiPayload = {
    observation: 'You are consistent.',
    supportiveDescription: 'Keep it up!',
    icon: '🌟'
}

describe('DailyObservationService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(checkInModel, 'getProfileContext').mockResolvedValue({
            id: PROFILE_ID,
            timezone: TIMEZONE
        })
        jest.spyOn(authModel, 'getUserLanguage').mockResolvedValue('en')
        jest.spyOn(dateHelpers, 'toLocalDateTimeStr').mockReturnValue('2026-06-04T00:00:00')
    })

    describe('getTodayObservation', () => {
        it('returns cached result without fetching when cache hit', async () => {
            const cached = { title: 'Cached', type: 'consistent_mood', observation: 'cached obs' }
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(cached)

            const result = await getTodayObservation(USER_ID)

            expect(result).toEqual(cached)
            expect(checkInModel.getCheckInsForStats).not.toHaveBeenCalled()
        })

        it('returns null and caches null when no detection', async () => {
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(undefined)
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([mockCheckIn()])
            jest.spyOn(observationDetectors, 'detectObservationType').mockReturnValue(null)
            const setSpy = jest.spyOn(dailyObservationCache, 'set').mockReturnValue(undefined)

            const result = await getTodayObservation(USER_ID)

            expect(result).toBeNull()
            expect(setSpy).toHaveBeenCalledWith(USER_ID, TIMEZONE, null)
        })

        it('generates observation via AI and returns result', async () => {
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(undefined)
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([mockCheckIn(['yoga'])])
            jest.spyOn(observationDetectors, 'detectObservationType').mockReturnValue({
                type: 'consistent_mood'
            })
            jest.spyOn(observationAiGenerator, 'generateObservation').mockResolvedValue(aiPayload)
            jest.spyOn(dailyObservationCache, 'set').mockReturnValue(undefined)

            const result = await getTodayObservation(USER_ID)

            expect(result).not.toBeNull()
            expect(result!.type).toBe('consistent_mood')
            expect(result!.observation).toBe('You are consistent.')
            expect(result!.title).toBe('Your Daily Observation')
        })

        it('falls back to template when AI generation fails', async () => {
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(undefined)
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([mockCheckIn()])
            jest.spyOn(observationDetectors, 'detectObservationType').mockReturnValue({
                type: 'active_lifestyle'
            })
            jest.spyOn(observationAiGenerator, 'generateObservation')
                .mockRejectedValue(new Error('AI down'))
            jest.spyOn(observationTemplates, 'getObservationTemplate').mockReturnValue(aiPayload)
            jest.spyOn(dailyObservationCache, 'set').mockReturnValue(undefined)

            const result = await getTodayObservation(USER_ID)

            expect(result!.observation).toBe('You are consistent.')
            expect(observationTemplates.getObservationTemplate)
                .toHaveBeenCalledWith('active_lifestyle')
        })

        it('caches the generated result', async () => {
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(undefined)
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([mockCheckIn()])
            jest.spyOn(observationDetectors, 'detectObservationType').mockReturnValue({
                type: 'consistent_mood'
            })
            jest.spyOn(observationAiGenerator, 'generateObservation').mockResolvedValue(aiPayload)
            const setSpy = jest.spyOn(dailyObservationCache, 'set').mockReturnValue(undefined)

            await getTodayObservation(USER_ID)

            expect(setSpy).toHaveBeenCalledWith(
                USER_ID,
                TIMEZONE,
                expect.objectContaining({ type: 'consistent_mood' })
            )
        })

        it('picks top activity from check-in data', async () => {
            jest.spyOn(dailyObservationCache, 'get').mockReturnValue(undefined)
            jest.spyOn(checkInModel, 'getCheckInsForStats').mockResolvedValue([
                mockCheckIn(['yoga', 'walking']),
                mockCheckIn(['yoga'])
            ])
            jest.spyOn(observationDetectors, 'detectObservationType').mockReturnValue({
                type: 'active_lifestyle'
            })
            const generateSpy = jest.spyOn(observationAiGenerator, 'generateObservation')
                .mockResolvedValue(aiPayload)
            jest.spyOn(dailyObservationCache, 'set').mockReturnValue(undefined)

            await getTodayObservation(USER_ID)

            expect(generateSpy).toHaveBeenCalledWith(
                expect.objectContaining({ topActivity: 'yoga' })
            )
        })
    })
})
