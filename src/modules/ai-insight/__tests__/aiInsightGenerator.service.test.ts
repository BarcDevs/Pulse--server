import type {CheckInType} from '../../../types/data/CheckInType'
import {generateInsight} from '../aiInsightGenerator.service'
import type {InsightDecisionResult} from '../insight.types'
import * as providerModule from '../providers'

jest.mock('../providers')

const mockCheckIn = (): CheckInType => ({
    id: 'id1',
    userId: 'user1',
    checkInDate: new Date(),
    moodScore: 5,
    painLevel: 3,
    activities: [],
    createdAt: new Date(),
    updatedAt: null,
    insights: []
})

const mockDecision = (
    type: 'MOOD_DROP_ALERT' | 'MOTIVATIONAL' | 'WEEKLY_SUMMARY'
): InsightDecisionResult => ({
    type,
    reason: 'test'
})

describe('generateInsight', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('calls provider and returns result', async () => {
        const mockProvider = {
            generateContent: jest
                .fn()
                .mockResolvedValue({
                    content: 'Your mood shifted.'
                })
        }

        jest.spyOn(
            providerModule,
            'createProvider'
        ).mockReturnValue(
            mockProvider as any
        )

        const result = await generateInsight({
            decision: mockDecision(
                'MOOD_DROP_ALERT'
            ),
            checkIns: [mockCheckIn()],
            userId: 'user1',
            checkInId: 'check1'
        })

        expect(result.content).toBeTruthy()
        expect(result.title).toBe(
            'Mood Check-In'
        )
    })

    it('uses fallback on validation failure', async () => {
        const mockProvider = {
            generateContent: jest
                .fn()
                .mockResolvedValue({
                    content:
                        'You may have depression'
                })
        }

        jest.spyOn(
            providerModule,
            'createProvider'
        ).mockReturnValue(
            mockProvider as any
        )

        const result = await generateInsight({
            decision: mockDecision(
                'WEEKLY_SUMMARY'
            ),
            checkIns: [mockCheckIn()],
            userId: 'user1',
            checkInId: 'check1'
        })

        expect(
            result.content.toLowerCase()
        ).not.toContain('may have')
    })
})
