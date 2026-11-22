import http from 'http'
import type { AddressInfo } from 'net'

export type FakeModelOptions = {
    delayMs: number
    delayJitterMs: number
    responseChars: number
    chunkChars: number
}

export const DEFAULT_OPTIONS: FakeModelOptions = {
    delayMs: 4000,
    delayJitterMs: 1500,
    responseChars: 900,
    chunkChars: 128
}

const FILLER = 'Thank you for checking in today. Small steady steps count, and resting is part of recovery. '

export const buildCompletion = (responseChars: number) => {
    const content = FILLER.repeat(Math.ceil(responseChars / FILLER.length)).slice(0, responseChars)

    return JSON.stringify({
        id: 'chatcmpl-loadtest',
        object: 'chat.completion',
        model: 'fake-model',
        choices: [{
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop'
        }],
        usage: {
            prompt_tokens: 600,
            completion_tokens: Math.round(responseChars / 4),
            total_tokens: 600 + Math.round(responseChars / 4)
        }
    })
}

export const splitIntoChunks = (body: string, chunkChars: number) => {
    const chunks: string[] = []
    for (let start = 0; start < body.length; start += chunkChars) {
        chunks.push(body.slice(start, start + chunkChars))
    }

    return chunks
}

// Copies the shape of a real chat completion call: it answers after a delay and
// sends the body in several chunks. Any path and method get the same answer, so
// it can stand in for the model provider during a load test.
export const createFakeModelServer = (overrides: Partial<FakeModelOptions> = {}) => {
    const options = { ...DEFAULT_OPTIONS, ...overrides }

    return http.createServer((request, response) => {
        request.resume()
        request.on('end', () => {
            const jitter = Math.round(Math.random() * options.delayJitterMs)
            setTimeout(() => {
                response.writeHead(200, { 'content-type': 'application/json' })
                const chunks = splitIntoChunks(buildCompletion(options.responseChars), options.chunkChars)
                chunks.forEach(chunk => response.write(chunk))
                response.end()
            }, options.delayMs + jitter)
        })
    })
}

const readFlag = (name: string, fallback: number) => {
    const found = process.argv.find(argument => argument.startsWith(`--${name}=`))

    return found ? Number(found.split('=')[1]) : fallback
}

if (require.main === module) {
    const port = readFlag('port', 8089)
    const server = createFakeModelServer({
        delayMs: readFlag('delay-ms', DEFAULT_OPTIONS.delayMs),
        delayJitterMs: readFlag('jitter-ms', DEFAULT_OPTIONS.delayJitterMs),
        responseChars: readFlag('response-chars', DEFAULT_OPTIONS.responseChars),
        chunkChars: readFlag('chunk-chars', DEFAULT_OPTIONS.chunkChars)
    })
    server.listen(port, () => {
        process.stdout.write(`Fake model endpoint on port ${(server.address() as AddressInfo).port}\n`)
    })
}
