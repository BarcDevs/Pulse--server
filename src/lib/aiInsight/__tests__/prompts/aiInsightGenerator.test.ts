import { generateInsight } from '../../../../services/aiInsightGeneratorService'
import * as providerModule from '../../../../services/aiProviders/ProviderFactory'
import type { CheckInType } from '../../../../types/data/CheckInType'
import type { InsightDecisionResult } from '../../../../types/insight'
import logger from '../../../../utils/logger'

jest.mock('../../../../services/aiProviders/ProviderFactory')
jest.mock('../../../../../config', () => ({
    aiConfig: {
        provider: 'google',
        googleApiKey: 'test-google-key',
        openaiApiKey: 'test-openai-key',
        anthropicApiKey: 'test-anthropic-key'
    },
    aiFallbackOrder: [],
    isProd: false,
    isDev: false,
    loggingConfig: { dir: 'logs' }
}))

const configModule = jest.requireMock('../../../../../config') as {
    aiConfig: {
        provider: string
        googleApiKey: string
        openaiApiKey: string
        anthropicApiKey: string
    }
    aiFallbackOrder: string[]
    isProd: boolean
}

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

const mockConfig = providerModule as jest.Mocked<typeof providerModule>

describe('generateInsight', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        configModule.isProd = false
        configModule.aiConfig.provider = 'google'
        configModule.aiFallbackOrder.length = 0

        // ProviderFactory is auto-mocked, so getApiKeyForProvider needs a real
        // implementation here too, mirroring the actual factory's key lookup.
        mockConfig.getApiKeyForProvider.mockImplementation((providerType: string) => {
            switch (providerType) {
                case 'openai':
                    return configModule.aiConfig.openaiApiKey
                case 'anthropic':
                    return configModule.aiConfig.anthropicApiKey
                case 'google':
                case 'google-pro':
                default:
                    return configModule.aiConfig.googleApiKey
            }
        })
    })

    it('calls provider and returns result', async () => {
        const mockProvider = {
            generateContent: jest
                .fn()
                .mockResolvedValue({
                    content: 'Your mood shifted.'
                })
        }

        mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

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

        mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

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

            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

            const result = await generateInsight({
                decision: mockDecision(
                    'MOOD_DROP_ALERT'
                ),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            // Dev/preview chain is just ['google'], 1 retry configured (2 attempts)
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(2)

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

            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

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

            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

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

            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

            const result = await generateInsight({
                decision: mockDecision(
                    'WEEKLY_SUMMARY'
                ),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            // 2 total attempts (1 retry) in dev/preview single-provider chain
            expect(
                mockProvider.generateContent
            ).toHaveBeenCalledTimes(2)

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

            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

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

    describe('provider fallback chain', () => {
        it('dev (isProd=false) only tries google, ignoring any configured chain', async () => {
            configModule.isProd = false
            configModule.aiConfig.provider = 'anthropic'
            configModule.aiFallbackOrder.push('google-pro', 'openai')

            const mockProvider = {
                generateContent: jest
                    .fn()
                    .mockResolvedValue({
                        content: 'This is a generated insight message for testing purposes'
                    })
            }
            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

            await generateInsight({
                decision: mockDecision('MOTIVATIONAL'),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            expect(mockConfig.createProviderByType).toHaveBeenCalledWith('google')
            expect(mockConfig.createProviderByType).toHaveBeenCalledTimes(1)
        })

        it('preview (NODE_ENV=production but isProd=false via APP_ENV) behaves like dev: google only', async () => {
            configModule.isProd = false
            configModule.aiConfig.provider = 'anthropic'
            configModule.aiFallbackOrder.push('google-pro', 'openai')

            const mockProvider = {
                generateContent: jest
                    .fn()
                    .mockResolvedValue({
                        content: 'This is a generated insight message for testing purposes'
                    })
            }
            mockConfig.createProviderByType.mockReturnValue(mockProvider as any)

            await generateInsight({
                decision: mockDecision('MOTIVATIONAL'),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            expect(mockConfig.createProviderByType).toHaveBeenCalledWith('google')
        })

        it('prod falls through anthropic -> google-pro -> openai in order on failure', async () => {
            configModule.isProd = true
            configModule.aiConfig.provider = 'anthropic'
            configModule.aiFallbackOrder.push('google-pro', 'openai')

            const failing = {
                generateContent: jest
                    .fn()
                    .mockRejectedValue(new Error('network error'))
            }
            const succeeding = {
                generateContent: jest
                    .fn()
                    .mockResolvedValue({
                        content: 'This is a generated insight message for testing purposes'
                    })
            }

            mockConfig.createProviderByType.mockImplementation((type: string) => (
                type === 'openai' ? succeeding : failing
            ) as any)

            const result = await generateInsight({
                decision: mockDecision('MOTIVATIONAL'),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            expect(
                mockConfig.createProviderByType.mock.calls.map(call => call[0])
            ).toEqual([
                'anthropic',
                'google-pro',
                'openai'
            ])
            expect(result.content).toContain(
                'This is a generated insight message for testing purposes'
            )
        })

        it('prod uses static fallback when every provider in the chain fails', async () => {
            configModule.isProd = true
            configModule.aiConfig.provider = 'anthropic'
            configModule.aiFallbackOrder.push('google-pro', 'openai')

            const failing = {
                generateContent: jest
                    .fn()
                    .mockRejectedValue(new Error('network error'))
            }
            mockConfig.createProviderByType.mockReturnValue(failing as any)

            const result = await generateInsight({
                decision: mockDecision('MOTIVATIONAL'),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            expect(
                mockConfig.createProviderByType.mock.calls.map(call => call[0])
            ).toEqual([
                'anthropic',
                'google-pro',
                'openai'
            ])
            expect(result.content).toBeTruthy()
            expect(result.title).toBeTruthy()
        })

        it('prod skips providers with no API key configured', async () => {
            const warnSpy = jest.spyOn(logger, 'warn').mockImplementation()
            configModule.isProd = true
            configModule.aiConfig.provider = 'anthropic'
            configModule.aiConfig.googleApiKey = ''
            configModule.aiFallbackOrder.push('google-pro', 'openai')

            const succeeding = {
                generateContent: jest
                    .fn()
                    .mockResolvedValue({
                        content: 'This is a generated insight message for testing purposes'
                    })
            }
            mockConfig.createProviderByType.mockReturnValue(succeeding as any)

            await generateInsight({
                decision: mockDecision('MOTIVATIONAL'),
                checkIns: [mockCheckIn()],
                userId: 'user1',
                checkInId: 'check1',
                language: 'en'
            })

            // google-pro shares googleApiKey, so it's skipped when that key is empty, and the skip is logged
            expect(warnSpy).toHaveBeenCalledWith(
                'AI provider google-pro skipped: no API key configured',
                { provider: 'google-pro' }
            )
            expect(mockConfig.createProviderByType).toHaveBeenCalledWith('anthropic')
            expect(mockConfig.createProviderByType).not.toHaveBeenCalledWith('google-pro')
            warnSpy.mockRestore()

            configModule.aiConfig.googleApiKey = 'test-google-key'
        })
    })
})
