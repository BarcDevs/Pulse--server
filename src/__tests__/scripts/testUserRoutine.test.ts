import {
    loadTestUsers,
    runRoutine
} from '../../../scripts/test-users/routine'

type Reply = { status: number, body?: unknown, cookies?: string[] }
type Routes = Record<string, Reply | (() => Reply)>

const BASE_URL = 'https://example.test'
const USER = { id: 2, email: 'testuser+1@example.test', password: 'secret-value' }

const createFetch = (routes: Routes) => {
    const calls: { method: string, path: string, csrf?: string }[] = []

    const fetchImpl = (async (url: string, init: RequestInit) => {
        const path = url.replace(`${BASE_URL}/api/v2`, '')
        const method = init.method ?? 'GET'
        const headers = init.headers as Record<string, string>

        calls.push({ method, path, csrf: headers['x-csrf-token'] })

        const route = routes[`${method} ${path}`]

        if (!route)
            return new Response(JSON.stringify({ message: 'not found' }), { status: 404 })

        const reply = typeof route === 'function' ? route() : route
        const response = new Response(JSON.stringify(reply.body ?? {}), { status: reply.status })

        for (const cookie of reply.cookies ?? [])
            response.headers.append('set-cookie', cookie)

        return response
    }) as unknown as typeof fetch

    return { fetchImpl, calls }
}

const deps = (fetchImpl: typeof fetch) => ({
    fetchImpl,
    sleep: async () => {},
    now: () => new Date('2026-11-19T12:00:00Z')
})

const okRoutes = (insightsStatus: () => string): Routes => ({
    'POST /auth/login': {
        status: 200,
        body: { message: 'user logged in!', data: { _csrf: 'csrf-1' } },
        cookies: ['accessToken=token-1; Path=/; HttpOnly', '_csrf=csrf-1; Path=/']
    },
    'GET /auth/me': { status: 200 },
    'GET /check-in?limit=1': () => ({
        status: 200,
        body: { data: [{ insightsStatus: insightsStatus() }] }
    }),
    'POST /check-in': { status: 201 },
    'GET /check-in/stats': { status: 200 },
    'GET /check-in/progress-insights': { status: 200 },
    'GET /profile': { status: 200 },
    'GET /recovery-goals': { status: 200 },
    'GET /forum/posts/categories': { status: 200 },
    'GET /forum/posts': { status: 200, body: { data: { items: [{ id: 'p1' }] } } },
    'GET /forum/recommendations': { status: 200 },
    'GET /forum/posts/p1': { status: 200 },
    'GET /forum/posts/p1/replies': { status: 200 }
})

describe('test user routine', () => {
    describe('loadTestUsers', () => {
        const env = {
            PULSE_TEST_USER_1_EMAIL: 'a@example.test',
            PULSE_TEST_USER_1_PASSWORD: 'x',
            PULSE_TEST_USER_2_EMAIL: 'b@example.test'
        } as NodeJS.ProcessEnv

        it('takes only users that have both an email and a password', () => {
            expect(loadTestUsers(env).map(user => user.id)).toEqual([1])
        })

        it('can select one user', () => {
            expect(loadTestUsers(env, 3)).toEqual([])
        })
    })

    describe('runRoutine', () => {
        it('passes every step and sends the csrf token on writes only', async () => {
            const { fetchImpl, calls } = createFetch(okRoutes(() => 'ready'))

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results.every(result => result.ok)).toBe(true)
            expect(calls.find(call => call.path === '/check-in' && call.method === 'POST')?.csrf)
                .toBe('csrf-1')
            expect(calls.filter(call => call.method === 'GET').every(call => !call.csrf))
                .toBe(true)
            expect(calls.map(call => call.path)).toContain('/forum/posts/p1/replies')
        })

        it('polls until the insights are ready', async () => {
            let polls = 0
            const { fetchImpl } = createFetch(okRoutes(() => (++polls >= 3 ? 'ready' : 'pending')))

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results.filter(result => result.step === 'insights poll').length).toBeGreaterThanOrEqual(2)
            expect(results.find(result => result.step === 'insights ready')).toBeUndefined()
        })

        it('reports insights that never get ready', async () => {
            const { fetchImpl } = createFetch(okRoutes(() => 'pending'))

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results.find(result => result.step === 'insights ready')?.ok).toBe(false)
        })

        it('stops after a failed login and reports the status without the password', async () => {
            const { fetchImpl, calls } = createFetch({
                'POST /auth/login': { status: 401, body: { message: 'Invalid credentials' } }
            })

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results).toHaveLength(1)
            expect(results[0]).toMatchObject({ step: 'login', status: 401, ok: false, detail: 'Invalid credentials' })
            expect(JSON.stringify(results)).not.toContain(USER.password)
            expect(calls).toHaveLength(1)
        })

        it('records a failing route and keeps going', async () => {
            const routes = okRoutes(() => 'ready')

            routes['GET /profile'] = { status: 500, body: { message: 'boom' } }
            const { fetchImpl } = createFetch(routes)

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results.find(result => result.step === 'profile')).toMatchObject({ ok: false, status: 500 })
            expect(results.find(result => result.step === 'forum posts')?.ok).toBe(true)
        })

        it('records a network error as a failed step', async () => {
            const fetchImpl = (async () => {
                throw new Error('connect ECONNREFUSED')
            }) as unknown as typeof fetch

            const results = await runRoutine([USER], BASE_URL, deps(fetchImpl))

            expect(results[0]).toMatchObject({ ok: false, status: 0, detail: 'connect ECONNREFUSED' })
        })
    })
})
