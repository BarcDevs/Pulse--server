import * as InsightDecision from '../../lib/aiInsight/decision/InsightDecision'
import * as insightsPrompts from '../../lib/aiInsight/prompts/insightsPrompts'
import * as aiInsightValidator from '../../lib/aiInsight/validation/aiInsightValidator'
import * as aiInsightModel from '../../models/aiInsightModel'
import * as authModel from '../../models/authModel'
import * as checkInModel from '../../models/checkInModel'
import * as aiInsightGeneratorService from '../../services/aiInsightGeneratorService'
import * as feedbackHelpers from '../../services/feedback/helpers'
import * as interventionOrchestrator from '../../services/feedback/interventionOrchestrator'
import { generateInsightForCheckIn } from '../../services/insightGenerationService'

jest.mock('../../lib/aiInsight/decision/InsightDecision')
jest.mock('../../lib/aiInsight/prompts/insightsPrompts')
jest.mock('../../lib/aiInsight/validation/aiInsightValidator')
jest.mock('../../models/aiInsightModel')
jest.mock('../../models/authModel')
jest.mock('../../models/checkInModel')
jest.mock('../../services/aiInsightGeneratorService')
jest.mock('../../services/feedback/helpers')
jest.mock('../../services/feedback/interventionOrchestrator')
jest.mock('../../locales', () => ({
    getMessages: jest.fn().mockReturnValue({
        insights: { titles: { BAD_DAY_SUPPORT: 'Support' } }
    } as never)
}))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const USER_ID = 'user-id-123'
const PROFILE_ID = 'profile-id-123'
const CHECK_IN_ID = 'check-in-id-123'

const makeCheckIn = (overrides = {}) => ({
    id: CHECK_IN_ID,
    profileId: PROFILE_ID,
    moodScore: 5,
    painLevel: 3,
    activities: ['walking'],
    notes: null,
    checkInDate: new Date('2026-06-04'),
    createdAt: new Date(),
    updatedAt: new Date(),
    insights: [],
    ...overrides
})

const mockDecision = { type: 'motivational', reason: 'streak', metadata: {} }

describe('InsightGenerationService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(checkInModel, 'getProfileIdForUser').mockResolvedValue(PROFILE_ID as never)
        jest.spyOn(checkInModel, 'getCheckInDates').mockResolvedValue([])
        jest.spyOn(authModel, 'getUserTimezone').mockResolvedValue('UTC')
        jest.spyOn(authModel, 'getUserLanguage').mockResolvedValue('en')
        jest.spyOn(authModel, 'getUserShareNotesWithAI').mockResolvedValue(true)
        jest.spyOn(InsightDecision, 'decideInsightType').mockReturnValue(mockDecision as never)
        jest.spyOn(aiInsightModel, 'createInsight').mockResolvedValue(undefined as never)
        jest.spyOn(aiInsightModel, 'getInsightsByUserId').mockResolvedValue([])
        jest.spyOn(interventionOrchestrator, 'generateInterventionInsight').mockResolvedValue(null as never)
        jest.spyOn(feedbackHelpers, 'isFirstCheckIn').mockReturnValue(false as never)
    })

    describe('generateInsightForCheckIn', () => {
        describe('shareNotesWithAI (M3)', () => {
            const notedCheckIn = makeCheckIn({ notes: 'private note' })

            beforeEach(() => {
                jest.spyOn(checkInModel, 'getCheckIns')
                    .mockResolvedValue([notedCheckIn] as never)
                jest.spyOn(aiInsightGeneratorService, 'generateInsight')
                    .mockResolvedValue({ title: 't', content: 'c' } as never)
            })

            it('sends notes to the AI generator by default', async () => {
                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                const [{ checkIns }] = jest.mocked(
                    aiInsightGeneratorService.generateInsight
                ).mock.calls[0]
                expect(checkIns[0].notes).toBe('private note')
            })

            it('strips notes from the AI prompt input when opted out', async () => {
                jest.spyOn(authModel, 'getUserShareNotesWithAI')
                    .mockResolvedValue(false)

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                const [{ checkIns }] = jest.mocked(
                    aiInsightGeneratorService.generateInsight
                ).mock.calls[0]
                expect(checkIns[0].notes).toBeNull()
                expect(JSON.stringify(checkIns)).not.toContain('private note')
            })
        })

        it('returns early when no recent check-ins', async () => {
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([])

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(aiInsightModel.createInsight).not.toHaveBeenCalled()
        })

        it('creates baseline insight via AI generator', async () => {
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([makeCheckIn()])
            jest.spyOn(aiInsightGeneratorService, 'generateInsight').mockResolvedValue({
                title: 'Great job!',
                content: 'You are doing well.'
            } as never)

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(aiInsightModel.createInsight).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: USER_ID,
                    checkInId: CHECK_IN_ID,
                    classification: 'baseline',
                    title: 'Great job!',
                    content: 'You are doing well.'
                })
            )
        })

        it('uses fallback when AI generation fails', async () => {
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([makeCheckIn()])
            jest.spyOn(aiInsightGeneratorService, 'generateInsight')
                .mockRejectedValue(new Error('AI down'))
            jest.spyOn(insightsPrompts, 'generateTitle').mockReturnValue('Fallback Title')
            jest.spyOn(aiInsightValidator, 'getFallbackContent').mockReturnValue('Fallback content.')

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(aiInsightModel.createInsight).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Fallback Title',
                    content: 'Fallback content.'
                })
            )
        })

        it('skips intervention when it is the first check-in', async () => {
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([makeCheckIn()])
            jest.spyOn(aiInsightGeneratorService, 'generateInsight').mockResolvedValue({
                title: 'T',
                content: 'C'
            } as never)
            jest.spyOn(feedbackHelpers, 'isFirstCheckIn').mockReturnValue(true as never)

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(interventionOrchestrator.generateInterventionInsight).not.toHaveBeenCalled()
        })

        it('generates intervention insight when not first check-in and intervention returned', async () => {
            const checkIns = [makeCheckIn(), makeCheckIn({ id: 'prev-id' })]
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue(checkIns as never)
            jest.spyOn(aiInsightGeneratorService, 'generateInsight').mockResolvedValue({
                title: 'T',
                content: 'C'
            } as never)
            jest.spyOn(feedbackHelpers, 'isFirstCheckIn').mockReturnValue(false as never)
            jest.spyOn(interventionOrchestrator, 'generateInterventionInsight').mockResolvedValue({
                message: 'You are supported.',
                priority: 'high',
                aiEnhanced: true,
                metadata: { mode: 'FULL', primaryReason: 'mood_drop', fallbackUsed: false }
            } as never)

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(aiInsightModel.createInsight).toHaveBeenCalledTimes(2)
            expect(aiInsightModel.createInsight).toHaveBeenNthCalledWith(2,
                expect.objectContaining({
                    insightType: 'BAD_DAY_SUPPORT',
                    classification: 'intervention'
                })
            )
        })

        it('skips saving intervention when orchestrator returns null', async () => {
            jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([makeCheckIn(), makeCheckIn()])
            jest.spyOn(aiInsightGeneratorService, 'generateInsight').mockResolvedValue({
                title: 'T',
                content: 'C'
            } as never)
            jest.spyOn(feedbackHelpers, 'isFirstCheckIn').mockReturnValue(false as never)
            jest.spyOn(interventionOrchestrator, 'generateInterventionInsight').mockResolvedValue(null as never)

            await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

            expect(aiInsightModel.createInsight).toHaveBeenCalledTimes(1)
        })

        describe('good check-in and streak stats', () => {
            const goodCheckIn = makeCheckIn({ moodScore: 8, painLevel: 2 })
            const day = (daysAgo: number) => {
                const date = new Date()
                date.setUTCHours(12, 0, 0, 0)
                date.setUTCDate(date.getUTCDate() - daysAgo)
                return date
            }

            beforeEach(() => {
                jest.spyOn(aiInsightGeneratorService, 'generateInsight')
                    .mockResolvedValue({ title: 'T', content: 'C' } as never)
                jest.spyOn(InsightDecision, 'decideInsightType').mockReturnValue(
                    { type: 'WEEKLY_SUMMARY', reason: 'enough data', metadata: { currentStreak: 1 } } as never
                )
            })

            it('creates a baseline and a motivational insight for a good check-in', async () => {
                jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([goodCheckIn] as never)

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                expect(aiInsightModel.createInsight).toHaveBeenCalledTimes(2)
                expect(aiInsightModel.createInsight).toHaveBeenNthCalledWith(1,
                    expect.objectContaining({ insightType: 'WEEKLY_SUMMARY', classification: 'baseline' })
                )
                expect(aiInsightModel.createInsight).toHaveBeenNthCalledWith(2,
                    expect.objectContaining({ insightType: 'MOTIVATIONAL', classification: 'baseline' })
                )
            })

            it('does not add a second motivational insight when the baseline already is one', async () => {
                jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([goodCheckIn] as never)
                jest.spyOn(InsightDecision, 'decideInsightType').mockReturnValue(
                    { type: 'MOTIVATIONAL', reason: 'low streak', metadata: {} } as never
                )

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                expect(aiInsightModel.createInsight).toHaveBeenCalledTimes(1)
            })

            it('creates only the baseline insight for an ordinary check-in', async () => {
                jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([makeCheckIn()] as never)

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                expect(aiInsightModel.createInsight).toHaveBeenCalledTimes(1)
            })

            it('gives the generator streak stats over all check-ins while the prompt keeps the recent ones', async () => {
                jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([goodCheckIn] as never)
                jest.spyOn(checkInModel, 'getCheckInDates')
                    .mockResolvedValue([day(0), day(1), day(2), day(5)])

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                const [{ decision, checkIns }] = jest.mocked(
                    aiInsightGeneratorService.generateInsight
                ).mock.calls[0]
                expect(checkIns).toHaveLength(1)
                expect(decision.metadata?.stats).toEqual({
                    currentStreak: 3,
                    longestStreak: 3,
                    totalCheckIns: 4
                })
            })

            it('gives the motivational insight the same stats', async () => {
                jest.spyOn(checkInModel, 'getCheckIns').mockResolvedValue([goodCheckIn] as never)
                jest.spyOn(checkInModel, 'getCheckInDates').mockResolvedValue([day(0), day(1)])

                await generateInsightForCheckIn(USER_ID, CHECK_IN_ID)

                const [, [{ decision }]] = jest.mocked(
                    aiInsightGeneratorService.generateInsight
                ).mock.calls
                expect(decision.type).toBe('MOTIVATIONAL')
                expect(decision.metadata?.stats?.currentStreak).toBe(2)
            })
        })
    })
})
