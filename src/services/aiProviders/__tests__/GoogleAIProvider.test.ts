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
})
