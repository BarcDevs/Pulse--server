/**
 * Routine for the production test users: logs in as each one and does what a
 * real user does in a day (check-in, insights, forum, profile, goals), then
 * prints one JSON line per step so a failure shows the route and the status.
 * Test users are real accounts, nothing is mocked. The passwords stay in the
 * gitignored .env as PULSE_TEST_USER_<N>_EMAIL / PULSE_TEST_USER_<N>_PASSWORD
 * and are never printed.
 *
 * Usage: npx tsx scripts/test-users/routine.ts [--base-url=https://pulserehab.app] [--user=2]
 * Exit code 1 when any step failed.
 */
import 'dotenv/config'

export type TestUser = {
    id: number
    email: string
    password: string
}

export type StepResult = {
    user: number
    step: string
    method: string
    path: string
    status: number
    ms: number
    ok: boolean
    detail?: string
}

type Deps = {
    fetchImpl: typeof fetch
    sleep: (ms: number) => Promise<void>
    now: () => Date
}

const DEFAULT_BASE_URL = 'https://pulserehab.app'
const API_PREFIX = '/api/v2'
const MAX_TEST_USERS = 20
const INSIGHT_POLL_MS = 3000
const INSIGHT_POLL_TRIES = 20
const DETAIL_MAX_LENGTH = 200
const ACTIVITIES = ['walking', 'stretching', 'swimming', 'yoga', 'cycling']

export const loadTestUsers = (env: NodeJS.ProcessEnv, only?: number): TestUser[] => {
    const users: TestUser[] = []

    for (let id = 1; id <= MAX_TEST_USERS; id++) {
        const email = env[`PULSE_TEST_USER_${id}_EMAIL`]
        const password = env[`PULSE_TEST_USER_${id}_PASSWORD`]

        if (email && password && (only === undefined || only === id))
            users.push({ id, email, password })
    }

    return users
}

type Json = Record<string, unknown>

const asRecord = (value: unknown): Json =>
    typeof value === 'object' && value !== null ? value as Json : {}

const firstItem = (data: unknown, key: string): Json | undefined => {
    const list = Array.isArray(data) ? data : asRecord(data)[key]

    return Array.isArray(list) ? asRecord(list[0]) : undefined
}

const checkInBody = (now: Date) => {
    const day = now.getUTCDate()

    return {
        moodScore: 5 + (day % 4),
        painLevel: 2 + (day % 3),
        activities: [ACTIVITIES[day % ACTIVITIES.length]],
        notes: `Routine check-in ${now.toISOString().slice(0, 10)}`
    }
}

type StepRequest = {
    step: string
    method: string
    path: string
    body?: unknown
}

type SessionOptions = {
    baseUrl: string
    deps: Deps
    user: TestUser
}

const isSuccess = (status: number) => status >= 200 && status < 300

const createSession = ({
    baseUrl,
    deps,
    user
}: SessionOptions) => {
    const cookies = new Map<string, string>()
    let csrf = ''
    const results: StepResult[] = []

    const request = async ({
        step,
        method,
        path,
        body
    }: StepRequest): Promise<{ status: number, json: Json }> => {
        const started = Date.now()
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
        }

        if (method !== 'GET' && csrf)
            headers['x-csrf-token'] = csrf

        let status = 0
        let json: Json = {}
        let detail: string | undefined

        try {
            const response = await deps.fetchImpl(`${baseUrl}${API_PREFIX}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body)
            })

            status = response.status
            json = asRecord(await response.json().catch(() => ({})))

            for (const header of response.headers.getSetCookie()) {
                const pair = header.split(';')[0]
                const separator = pair.indexOf('=')

                cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
            }
        } catch (error) {
            detail = error instanceof Error ? error.message : 'request failed'
        }

        const ok = detail === undefined && isSuccess(status)

        if (!ok && detail === undefined)
            detail = String(json.message ?? '').slice(0, DETAIL_MAX_LENGTH)

        results.push({
            user: user.id,
            step,
            method,
            path,
            status,
            ms: Date.now() - started,
            ok,
            detail: ok ? undefined : detail
        })

        return { status, json }
    }

    return {
        results,
        request,
        setCsrf: (token: string) => {
            csrf = token
        },
        cookieToken: () => cookies.get('_csrf') ?? ''
    }
}

const runUser = async (options: SessionOptions): Promise<StepResult[]> => {
    const {
        user,
        deps
    } = options
    const session = createSession(options)
    const { request } = session
    const get = (step: string, path: string) => request({
        step,
        method: 'GET',
        path
    })

    const login = await request({
        step: 'login',
        method: 'POST',
        path: '/auth/login',
        body: {
            email: user.email,
            password: user.password
        }
    })

    if (login.status !== 200)
        return session.results

    session.setCsrf(String(asRecord(login.json.data)._csrf ?? session.cookieToken()))

    await get('me', '/auth/me')
    await get('check-in list', '/check-in?limit=1')

    const created = await request({
        step: 'check-in create',
        method: 'POST',
        path: '/check-in',
        body: checkInBody(deps.now())
    })

    if (created.status === 200 || created.status === 201)
        await waitForInsights(session, deps)

    await get('check-in stats', '/check-in/stats')
    await get('progress insights', '/check-in/progress-insights')
    await get('profile', '/profile')
    await get('recovery goals', '/recovery-goals')
    await get('forum categories', '/forum/posts/categories')
    const posts = await get('forum posts', '/forum/posts')
    await get('forum recommendations', '/forum/recommendations')

    const post = firstItem(posts.json.data, 'posts')

    if (post?.id) {
        await get('forum post', `/forum/posts/${String(post.id)}`)
        await get('forum replies', `/forum/posts/${String(post.id)}/replies`)
    }

    return session.results
}

const waitForInsights = async (
    session: ReturnType<typeof createSession>,
    deps: Deps
) => {
    for (let attempt = 1; attempt <= INSIGHT_POLL_TRIES; attempt++) {
        await deps.sleep(INSIGHT_POLL_MS)

        const { json } = await session.request({
            step: 'insights poll',
            method: 'GET',
            path: '/check-in?limit=1'
        })

        if (firstItem(json.data, 'checkIns')?.insightsStatus === 'ready')
            return
    }

    session.results.push({
        user: Number(session.results[0]?.user ?? 0),
        step: 'insights ready',
        method: 'GET',
        path: '/check-in?limit=1',
        status: 0,
        ms: INSIGHT_POLL_MS * INSIGHT_POLL_TRIES,
        ok: false,
        detail: 'insights still pending after the polling limit'
    })
}

export const runRoutine = async (
    users: TestUser[],
    baseUrl: string,
    deps: Deps
): Promise<StepResult[]> => {
    const all: StepResult[] = []

    for (const user of users)
        all.push(...await runUser({ user, baseUrl, deps }))

    return all
}

const readArg = (name: string): string | undefined =>
    process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1]

const main = async () => {
    const only = readArg('user')
    const users = loadTestUsers(process.env, only ? Number(only) : undefined)

    if (users.length === 0) {
        console.error('[routine] no PULSE_TEST_USER_<N>_EMAIL and _PASSWORD pairs in .env - aborting')
        process.exitCode = 1

        return
    }

    const results = await runRoutine(
        users,
        readArg('base-url') ?? process.env.PULSE_TEST_BASE_URL ?? DEFAULT_BASE_URL,
        {
            fetchImpl: fetch,
            sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
            now: () => new Date()
        }
    )

    for (const result of results)
        console.info(JSON.stringify({ at: new Date().toISOString(), ...result }))

    const failed = results.filter(result => !result.ok)

    console.info(JSON.stringify({
        at: new Date().toISOString(),
        summary: true,
        users: users.length,
        steps: results.length,
        failed: failed.length
    }))

    if (failed.length > 0)
        process.exitCode = 1
}

if (require.main === module)
    void main()
