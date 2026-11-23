import { OpenAIProvider } from '../../services/aiProviders/OpenAIProvider'

const mockAiConfig = {
    openaiApiKey: 'test-key',
    openaiModel: 'test-model',
    openaiBaseUrl: 'https://api.openai.com/v1'
}

jest.mock('../../../config', () => ({
    get aiConfig() {
        return mockAiConfig
    },
    aiGenerationConfig: { maxOutputTokens: 100, timeoutMs: 1000 }
}))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

const okResponse = () => ({
    ok: true,
    json: async () => ({
        choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }]
    })
})

describe('OpenAIProvider endpoint', () => {
    const fetchMock = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        mockAiConfig.openaiBaseUrl = 'https://api.openai.com/v1'
        fetchMock.mockResolvedValue(okResponse())
        global.fetch = fetchMock as unknown as typeof fetch
    })

    it('calls the OpenAI chat completions endpoint by default', async () => {
        await new OpenAIProvider({ apiKey: 'test-key' }).generateContent({ prompt: 'hi' } as never)

        expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('calls the configured base URL, which the load test points at the fake model server', async () => {
        mockAiConfig.openaiBaseUrl = 'http://10.0.0.9:8089/v1'

        await new OpenAIProvider({ apiKey: 'test-key' }).generateContent({ prompt: 'hi' } as never)

        expect(fetchMock.mock.calls[0][0]).toBe('http://10.0.0.9:8089/v1/chat/completions')
    })
})
