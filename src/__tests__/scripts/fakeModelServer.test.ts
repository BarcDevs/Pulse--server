import http from 'http'
import type { AddressInfo } from 'net'

import {
    buildCompletion,
    createFakeModelServer,
    splitIntoChunks
} from '../../../scripts/load-test/fakeModelServer'

const request = (port: number) => new Promise<{ status: number, chunks: Buffer[], ms: number }>((resolve, reject) => {
    const started = Date.now()
    const chunks: Buffer[] = []
    const call = http.request({ port, method: 'POST', path: '/v1/chat/completions' }, response => {
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => resolve({ status: response.statusCode ?? 0, chunks, ms: Date.now() - started }))
    })
    call.on('error', reject)
    call.end('{}')
})

describe('fake model server', () => {
    describe('buildCompletion', () => {
        it('returns the requested number of characters in a chat completion shape', () => {
            const parsed = JSON.parse(buildCompletion(500))

            expect(parsed.choices[0].message.content).toHaveLength(500)
            expect(parsed.choices[0].finish_reason).toBe('stop')
        })
    })

    describe('splitIntoChunks', () => {
        it('splits a body into pieces of at most the chunk size', () => {
            const chunks = splitIntoChunks('abcdefghij', 4)

            expect(chunks).toEqual(['abcd', 'efgh', 'ij'])
        })
    })

    describe('server', () => {
        let server: http.Server

        afterEach(done => {
            server.close(() => done())
        })

        const start = async (options: Parameters<typeof createFakeModelServer>[0]) => {
            server = createFakeModelServer(options)
            await new Promise<void>(resolve => server.listen(0, resolve))

            return (server.address() as AddressInfo).port
        }

        it('answers only after the delay', async () => {
            const port = await start({ delayMs: 300, delayJitterMs: 0, responseChars: 200 })

            const result = await request(port)

            expect(result.status).toBe(200)
            expect(result.ms).toBeGreaterThanOrEqual(280)
        })

        it('sends the body in several chunks that parse as one completion', async () => {
            const port = await start({ delayMs: 0, delayJitterMs: 0, responseChars: 2000, chunkChars: 64 })

            const result = await request(port)
            const body = JSON.parse(Buffer.concat(result.chunks).toString('utf8'))

            expect(result.chunks.length).toBeGreaterThan(1)
            expect(body.choices[0].message.content).toHaveLength(2000)
        })
    })
})
