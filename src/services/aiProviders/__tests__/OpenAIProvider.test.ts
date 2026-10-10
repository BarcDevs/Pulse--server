import { OpenAIProvider } from '../OpenAIProvider'

describe('OpenAIProvider', () => {
    const fetchMock = jest.fn()

    const respondWith = (body: object) => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => body
        })
    }

    beforeEach(() => {
        fetchMock.mockReset()
        global.fetch = fetchMock as unknown as typeof fetch
    })

    const createProvider = () => new OpenAIProvider({
        apiKey: 'test-openai-key',
        modelId: 'gpt-test'
    })

    it('returns the text of a finished response', async () => {
        respondWith({
            choices: [{
                message: { content: 'a full message.' },
                finish_reason: 'stop'
            }]
        })

        const result = await createProvider()
            .generateContent({ prompt: 'hi' })

        expect(result.content).toBe('a full message.')
    })

    it('rejects a response cut off at the token limit', async () => {
        respondWith({
            choices: [{
                message: { content: 'a message that stops mid' },
                finish_reason: 'length'
            }],
            usage: {
                completion_tokens: 1000,
                completion_tokens_details: { reasoning_tokens: 900 }
            }
        })

        await expect(
            createProvider().generateContent({ prompt: 'hi' })
        ).rejects.toThrow('cut off')
    })
})
