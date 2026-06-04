// @ts-nocheck
import * as insightGenerationService from '../../services/insightGenerationService'
import { generateInsightSafely } from '../../services/insightService'

jest.mock('../../services/insightGenerationService')
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}))

const USER_ID = 'user-id-123'
const CHECK_IN_ID = 'check-in-id-123'

describe('InsightService', () => {
    beforeEach(() => jest.clearAllMocks())

    describe('generateInsightSafely', () => {
        it('calls generateInsightForCheckIn with correct args', async () => {
            jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
                .mockResolvedValue(undefined)

            await generateInsightSafely(USER_ID, CHECK_IN_ID)

            expect(insightGenerationService.generateInsightForCheckIn)
                .toHaveBeenCalledWith(USER_ID, CHECK_IN_ID)
        })

        it('does not throw when generateInsightForCheckIn fails', async () => {
            jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
                .mockRejectedValue(new Error('AI service down'))

            await expect(
                generateInsightSafely(USER_ID, CHECK_IN_ID)
            ).resolves.toBeUndefined()
        })

        it('swallows non-Error rejections without throwing', async () => {
            jest.spyOn(insightGenerationService, 'generateInsightForCheckIn')
                .mockRejectedValue('string error')

            await expect(
                generateInsightSafely(USER_ID, CHECK_IN_ID)
            ).resolves.toBeUndefined()
        })
    })
})
