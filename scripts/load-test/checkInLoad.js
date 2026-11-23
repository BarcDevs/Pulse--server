// k6 load test for the Pulse server (milestone H2). Not part of the server build.
//
// One round of a virtual user is one person's session, the same steps as scripts/test-users/routine.ts:
// login, me, check-in list, check-in create, poll until the insight is ready,
// stats, progress insights, profile, goals and a few forum reads.
//
// Alongside it a second scenario hits /api/status at a steady rate, so a gap
// during a deploy shows up as failed probes in its own metric.
//
// Run it against a CLONE, never against production:
//   k6 run -e BASE_URL=http://10.0.0.5:8080 -e API_VERSION=v1 -e USERS=1500 -e PEAK_VUS=100 scripts/load-test/checkInLoad.js
// USERS is the number of people created; it must be at least the number of rounds the run will start
// (rounds = about PEAK_VUS times the run length divided by the 10 to 30 seconds one round takes).
//   (docker: docker run --rm -i -e BASE_URL=... grafana/k6 run - < scripts/load-test/checkInLoad.js)
//
// The users are created in setup() through the API. The server limits sign-ups
// per address (5 an hour), so every user is sent from its own made-up address in
// X-Forwarded-For: that works only when k6 talks to the server directly, not
// through Cloudflare (the server trusts the last forwarded address). Confirm
// them in the clone's database before the ramp starts, once setup has run:
//   UPDATE "User" SET "emailVerifiedAt" = now() WHERE email LIKE 'loadtest+%@example.test';
// k6 pauses nowhere for that, so run setup alone first: k6 run -e SETUP_ONLY=1 ...
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API = `${BASE_URL}/api/${__ENV.API_VERSION || 'v1'}`
const USERS = Number(__ENV.USERS || 50)
const PASSWORD = __ENV.USER_PASSWORD || 'LoadTest-Password1!'
const EMAIL_PREFIX = __ENV.EMAIL_PREFIX || 'loadtest'
const EMAIL_DOMAIN = __ENV.EMAIL_DOMAIN || 'example.test'
const PEAK_VUS = Number(__ENV.PEAK_VUS || USERS)
const INSIGHT_POLL_MS = 3000
const INSIGHT_POLL_TRIES = 40
const SETUP_ONLY = __ENV.SETUP_ONLY === '1'
// Users made beforehand with scripts/load-test/seedUsersSql.cjs: skip the sign-up calls
const SKIP_SIGNUP = __ENV.SKIP_SIGNUP === '1'

const insightReadySeconds = new Trend('insight_ready_seconds')
const insightNeverReady = new Counter('insight_never_ready')
const statusProbeFailed = new Rate('status_probe_failed')

export const options = SETUP_ONLY
    ? { vus: 1, iterations: 1 }
    : {
        scenarios: {
            checkins: {
                executor: 'ramping-vus',
                exec: 'userFlow',
                startVUs: 0,
                // A defined ramp: warm up, climb, hold (the deploy is started in the hold),
                // then ramp down. Change the numbers with PEAK_VUS and the HOLD_* variables.
                stages: [
                    { duration: __ENV.RAMP_UP || '2m', target: Math.ceil(PEAK_VUS / 2) },
                    { duration: __ENV.RAMP_PEAK || '2m', target: PEAK_VUS },
                    { duration: __ENV.HOLD || '10m', target: PEAK_VUS },
                    { duration: __ENV.RAMP_DOWN || '1m', target: 0 }
                ],
                gracefulRampDown: '60s'
            },
            statusProbe: {
                executor: 'constant-arrival-rate',
                exec: 'probeStatus',
                rate: 2,
                timeUnit: '1s',
                duration: __ENV.PROBE_DURATION || '15m',
                preAllocatedVUs: 2
            }
        },
        thresholds: {
            // The bar of milestone H4: no failed requests
            http_req_failed: ['rate<0.01'],
            http_req_duration: ['p(95)<2000'],
            status_probe_failed: ['rate<0.001'],
            insight_never_ready: ['count==0']
        }
    }

const emailOf = (index) => `${EMAIL_PREFIX}+${index}@${EMAIL_DOMAIN}`

// One made-up address per user (the 10.x range), see the header
const addressOf = (index) => `10.${Math.floor(index / 65025) % 255}.${Math.floor(index / 255) % 255}.${(index % 255) + 1}`

const jsonHeaders = (extra = {}) => ({ headers: { 'Content-Type': 'application/json', ...extra } })

export function setup() {
    const emails = []

    for (let index = 1; index <= USERS; index += 1) {
        if (SKIP_SIGNUP) {
            emails.push(emailOf(index))
            continue
        }

        const response = http.post(
            `${API}/auth/signup`,
            JSON.stringify({
                firstName: 'Load',
                lastName: `User${index}`,
                email: emailOf(index),
                password: PASSWORD
            }),
            {
                ...jsonHeaders({ 'X-Forwarded-For': addressOf(index) }),
                // A user left by an earlier run answers 4xx: expected, not a failure
                responseCallback: http.expectedStatuses({ min: 200, max: 299 }, 400, 409)
            }
        )

        // 409 or similar when the user exists from an earlier run: fine
        if (response.status >= 500) {
            throw new Error(`Sign-up failed for user ${index}: ${response.status}`)
        }
        emails.push(emailOf(index))
    }

    return { emails }
}

const login = (email, address) => {
    const response = http.post(
        `${API}/auth/login`,
        JSON.stringify({ email, password: PASSWORD }),
        jsonHeaders({ 'X-Forwarded-For': address })
    )
    check(response, { 'login 200': (r) => r.status === 200 })
    if (response.status !== 200) return null

    const body = response.json()

    return (body && body.data && body.data._csrf) || null
}

const checkInBody = () => ({
    moodScore: 3 + Math.floor(Math.random() * 6),
    painLevel: Math.floor(Math.random() * 6),
    activities: []
})

export function userFlow(data) {
    if (SETUP_ONLY) return

    // Every round of every virtual user is a different user, so each one logs in and checks in
    // once, like a real person, and no address passes the server's request limits.
    // USERS must be at least the number of rounds the run will start.
    const index = ((__ITER * PEAK_VUS + (__VU - 1)) % data.emails.length) + 1
    const address = addressOf(index)
    const headersFor = (csrf) => jsonHeaders({ 'X-Forwarded-For': address, 'x-csrf-token': csrf || '' })

    // k6 keeps cookies per virtual user, so the session cookie is carried along
    const csrf = login(data.emails[index - 1], address)
    if (!csrf) {
        sleep(5)

        return
    }

    group('read', () => {
        http.get(`${API}/auth/me`, headersFor(csrf))
        http.get(`${API}/check-in?limit=1`, headersFor(csrf))
    })

    group('check-in', () => {
        const started = Date.now()
        // A user can check in once a day: later rounds of the same virtual user get
        // a 400, which is expected here and skips the insight wait
        const created = http.post(
            `${API}/check-in`,
            JSON.stringify(checkInBody()),
            { ...headersFor(csrf), responseCallback: http.expectedStatuses({ min: 200, max: 299 }, 400) }
        )
        check(created, { 'check-in saved or already done today': (r) => (r.status >= 200 && r.status < 300) || r.status === 400 })

        if (created.status < 200 || created.status >= 300) return

        for (let attempt = 0; attempt < INSIGHT_POLL_TRIES; attempt += 1) {
            sleep(INSIGHT_POLL_MS / 1000)
            const poll = http.get(`${API}/check-in?limit=1`, headersFor(csrf))
            const items = poll.json('data.checkIns')

            if (items && items[0] && items[0].insightsStatus === 'ready') {
                insightReadySeconds.add((Date.now() - started) / 1000)

                return
            }
        }
        insightNeverReady.add(1)
    })

    group('browse', () => {
        http.get(`${API}/check-in/stats`, headersFor(csrf))
        http.get(`${API}/check-in/progress-insights`, headersFor(csrf))
        http.get(`${API}/profile`, headersFor(csrf))
        http.get(`${API}/recovery-goals`, headersFor(csrf))
        http.get(`${API}/forum/posts/categories`, headersFor(csrf))
        http.get(`${API}/forum/posts`, headersFor(csrf))
        http.get(`${API}/forum/recommendations`, headersFor(csrf))
    })

    sleep(5 + Math.random() * 10)
}

export function probeStatus() {
    // A made-up address per probe, so the per-address request limit does not answer 429
    const response = http.get(`${BASE_URL}/api/status`, jsonHeaders({ 'X-Forwarded-For': addressOf(100000 + Math.floor(Math.random() * 100000)) }))
    statusProbeFailed.add(response.status !== 200)
}

// Only used by the SETUP_ONLY run, which has no scenarios
export default function () {}
