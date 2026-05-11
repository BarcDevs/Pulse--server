import { generateInsight } from '../../../../services/aiInsightGeneratorService'
import * as providerModule from '../../../../services/aiProviders/ProviderFactory'
import type { CheckInType } from '../../../../types/data/CheckInType'
import type { InsightDecisionResult } from '../../../../types/insight'

jest.mock('../../../../services/aiProviders/ProviderFactory')

const mockCheckIn = (): CheckInType => ({
    id: 'id1',
    profileId: 'profile1',
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
            checkInId: 'check1',
            language: 'en'
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
            checkInId: 'check1',
            language: 'en'
        })

        expect(
            result.content.toLowerCase()
        ).not.toContain('may have')
    })

    it(
        'retries on API error and uses fallback if retries exhausted',
        async () => {
            const mockProvider = {
                generateContent: jest.fn()
                    .mockRejectedValue(
                        new Error(
                            'Failed to generate content from Google AI: 500'
                        )
                    )
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
                checkInId: 'check1',
            language: 'en'
            })

            // Should have tried 3 times (initial + 2 retries)
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(3)

            // Should use fallback
            expect(result.content).toBeTruthy()
            expect(result.title).toBe('Mood Check-In')
        }
    )

    it(
        'retries on network error and succeeds on second attempt',
        async () => {
            const mockProvider = {
                generateContent: jest.fn()
                    .mockRejectedValueOnce(
                        new Error('ECONNREFUSED: connection refused')
                    )
                    .mockResolvedValueOnce({
                        content: 'Keep pushing forward'
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
                    'MOTIVATIONAL'
                ),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
            language: 'en'
            })

            // Called twice: once failed, once succeeded
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(2)

            expect(result.content).toContain(
                'Keep pushing forward'
            )
        }
    )

    it(
        'does not retry on validation failure',
        async () => {
            const mockProvider = {
                generateContent: jest.fn()
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
                    'MOOD_DROP_ALERT'
                ),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
            language: 'en'
            })

            // Should only call once (no retries for validation failure)
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(1)

            // Uses fallback because content failed validation
            expect(result.content).toBeTruthy()
        }
    )

    it(
        'retries on timeout and uses fallback if all retries fail',
        async () => {
            const mockProvider = {
                generateContent: jest.fn()
                    .mockRejectedValue(
                        new Error(
                            'Request timeout waiting for response'
                        )
                    )
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
                checkInId: 'check1',
            language: 'en'
            })

            // 3 total attempts
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(3)

            // Falls back to static content
            expect(result.content).toBeTruthy()
            expect(result.title).toBeTruthy()
        }
    )

    it(
        'does not break check-in flow on retry failure',
        async () => {
            const mockProvider = {
                generateContent: jest.fn()
                    .mockRejectedValue(
                        new Error('API service unavailable')
                    )
            }

            jest.spyOn(
                providerModule,
                'createProvider'
            ).mockReturnValue(
                mockProvider as any
            )

            // Should not throw, should return fallback
            const result = await generateInsight({
                decision: mockDecision(
                    'MOTIVATIONAL'
                ),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
            language: 'en'
            })

            expect(result).toHaveProperty('title')
            expect(result).toHaveProperty('content')
            expect(result.content.length).toBeGreaterThan(0)
        }
    )
})
