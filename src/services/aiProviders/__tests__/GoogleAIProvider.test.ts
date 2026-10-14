import { GoogleAIProvider } from '../GoogleAIProvider'

const API_KEY = 'test-google-key'

describe('GoogleAIProvider', () => {
    const fetchMock = jest.fn()

    beforeEach(() => {
        fetchMock.mockReset().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'hello' }] } }]
            })
        })
        global.fetch = fetchMock as unknown as typeof fetch
    })

    it('sends the API key in a header, never in the URL', async () => {
        const provider = new GoogleAIProvider({
            apiKey: API_KEY,
            modelId: 'gemini-test'
        })

        await provider.generateContent({ prompt: 'hi' })

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).not.toContain(API_KEY)
        expect(url).not.toContain('key=')
        expect(init.headers['x-goog-api-key']).toBe(API_KEY)
    })

    it('rejects a response cut off at the token limit', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    finishReason: 'MAX_TOKENS',
                    content: { parts: [{ text: 'a message that stops mid' }] }
                }],
                usageMetadata: { totalTokenCount: 1251, thoughtsTokenCount: 1100 }
            })
        })
        const provider = new GoogleAIProvider({
            apiKey: API_KEY,
            modelId: 'gemini-test'
        })

        await expect(
            provider.generateContent({ prompt: 'hi' })
        ).rejects.toThrow('cut off')
    })

    it('returns the text of a finished response', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    finishReason: 'STOP',
                    content: { parts: [{ text: 'a full message.' }] }
                }]
            })
        })
        const provider = new GoogleAIProvider({
            apiKey: API_KEY,
            modelId: 'gemini-test'
        })

        expect((await provider.generateContent({ prompt: 'hi' })).content)
            .toBe('a full message.')
    })
})
