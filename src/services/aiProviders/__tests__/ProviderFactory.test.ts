import {
    createProviderByType,
    getApiKeyForProvider
} from '../ProviderFactory'

jest.mock('../../../../config', () => ({
    aiConfig: {
        provider: 'google',
        googleFreeModel: 'gemini-3.1-flash-lite',
        googleModel: 'gemini-3.1-pro-preview',
        anthropicModel: 'claude-sonnet-5',
        openaiModel: 'gpt-5.6-sol',
        googleApiKey: 'test-google-key',
        googleFreeApiKey: '',
        openaiApiKey: 'test-openai-key',
        anthropicApiKey: 'test-anthropic-key'
    },
    aiGenerationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        timeoutMs: 15000
    },
    loggingConfig: { dir: 'logs' },
    isProd: true
}))

const configModule = jest.requireMock('../../../../config') as {
    aiConfig: {
        googleApiKey: string
        googleFreeApiKey: string
    }
    isProd: boolean
}

describe('createProviderByType', () => {
    let fetchMock: jest.Mock

    beforeEach(() => {
        configModule.isProd = true
        configModule.aiConfig.googleApiKey = 'test-google-key'
        configModule.aiConfig.googleFreeApiKey = ''

        fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        finishReason: 'STOP',
                        content: { parts: [{ text: 'ok' }] }
                    }
                ]
            })
        })
        global.fetch = fetchMock as any
    })

    it('google hits the lite model endpoint', async () => {
        const provider = createProviderByType('google')
        await provider.generateContent({ prompt: 'hi' })

        const calledUrl = fetchMock.mock.calls[0][0] as string
        expect(calledUrl).toContain('/models/gemini-3.1-flash-lite:generateContent')
    })

    it('google-pro actually hits the pro model endpoint, not the lite one', async () => {
        const provider = createProviderByType('google-pro')
        await provider.generateContent({ prompt: 'hi' })

        const calledUrl = fetchMock.mock.calls[0][0] as string
        expect(calledUrl).toContain('/models/gemini-3.1-pro-preview:generateContent')
        expect(calledUrl).not.toContain('gemini-3.1-flash-lite')
    })

    it(
        'google and google-pro both authenticate with the shared google API key in prod',
        async () => {
            const liteProvider = createProviderByType('google')
            const proProvider = createProviderByType('google-pro')

            await liteProvider.generateContent({ prompt: 'hi' })
            await proProvider.generateContent({ prompt: 'hi' })

            expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key'])
                .toBe('test-google-key')
            expect(fetchMock.mock.calls[1][1].headers['x-goog-api-key'])
                .toBe('test-google-key')
        }
    )

    describe('dev/preview free-tier key', () => {
        it(
            'google uses GOOGLE_FREE_AI_API_KEY when not prod and it is set',
            () => {
                configModule.isProd = false
                configModule.aiConfig.googleFreeApiKey = 'free-tier-key'

                expect(getApiKeyForProvider('google'))
                    .toBe('free-tier-key')
            }
        )

        it(
            'google falls back to the paid key when not prod but no free key is set',
            () => {
                configModule.isProd = false
                configModule.aiConfig.googleFreeApiKey = ''

                expect(getApiKeyForProvider('google'))
                    .toBe('test-google-key')
            }
        )

        it(
            'google ignores the free key in prod even if one is set',
            () => {
                configModule.isProd = true
                configModule.aiConfig.googleFreeApiKey = 'free-tier-key'

                expect(getApiKeyForProvider('google'))
                    .toBe('test-google-key')
            }
        )

        it(
            'google-pro always uses the paid key, never the free-tier one',
            () => {
                configModule.isProd = false
                configModule.aiConfig.googleFreeApiKey = 'free-tier-key'

                expect(getApiKeyForProvider('google-pro'))
                    .toBe('test-google-key')
            }
        )
    })
})
