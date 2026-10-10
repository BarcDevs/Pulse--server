import { AnthropicProvider } from '../AnthropicProvider'

describe('AnthropicProvider', () => {
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

    const createProvider = () => new AnthropicProvider({
        apiKey: 'test-anthropic-key',
        modelId: 'claude-test'
    })

    it('returns the text of a finished response', async () => {
        respondWith({
            content: [{ type: 'text', text: 'a full message.' }],
            stop_reason: 'end_turn'
        })

        const result = await createProvider()
            .generateContent({ prompt: 'hi' })

        expect(result.content).toBe('a full message.')
    })

    it('rejects a response cut off at the token limit', async () => {
        respondWith({
            content: [{ type: 'text', text: 'a message that stops mid' }],
            stop_reason: 'max_tokens',
            usage: { output_tokens: 1000 }
        })

        await expect(
            createProvider().generateContent({ prompt: 'hi' })
        ).rejects.toThrow('cut off')
    })
})
