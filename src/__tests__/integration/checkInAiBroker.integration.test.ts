// Runs only with a real broker and the test database:
//   docker compose -f docker-compose.test.yml up -d
//   a RabbitMQ container with scripts/deploy/compose/rabbitmq/definitions.json loaded and a
//   user pulse_node with rights on the vhost /pulse, named in RABBITMQ_TEST_CONTAINER
//   RABBITMQ_HOST=127.0.0.1 RABBITMQ_NODE_PASSWORD=... JOB_BACKEND=rabbitmq
//   RABBITMQ_TEST_CONTAINER=pulse-rmq-test npm run test:integration -- checkInAiBroker
// CI has no broker, so these tests are skipped there.
import { execSync } from 'child_process'
import Csrf from 'csrf'
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { createToken } from '../../lib/authCrypto'
import { closeBroker } from '../../lib/queue/broker'
import { startCheckInAiConsumer } from '../../services/checkInAiQueueService'
import * as insightGenerationService from '../../services/insightGenerationService'
import * as recommendationsService from '../../services/recommendationsService'
import Prisma from '../../utils/prismaClient'

jest.mock('../../services/insightGenerationService')
jest.mock('../../services/recommendationsService')

const container = process.env.RABBITMQ_TEST_CONTAINER ?? ''
const describeWithBroker = process.env.RABBITMQ_HOST && container ? describe : describe.skip

const csrfLib = new Csrf()
const CHECK_IN_URL = `/api/${serverConfig.apiVersion}/check-in`
const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`

const docker = (command: string) => execSync(`docker ${command}`, {
    encoding: 'utf8',
    env: { ...process.env, MSYS_NO_PATHCONV: '1' }
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const waitFor = async (check: () => Promise<boolean>, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (await check()) return true
        await sleep(250)
    }

    return false
}

const createCheckIn = async () => {
    await supertest(App).post(SIGNUP_URL).send({
        firstName: 'Job',
        lastName: 'Tester',
        email: 'broker@test.com',
        password: 'Password123!'
    })
    const user = await Prisma.user.findUnique({ where: { email: 'broker@test.com' } })
    const secret = csrfLib.secretSync()

    await supertest(App)
        .post(CHECK_IN_URL)
        .set('Cookie', [`accessToken=${createToken(user!)}`, `_csrf=${secret}`])
        .set('x-csrf-token', csrfLib.create(secret))
        .send({ moodScore: 7, painLevel: 3, activities: [] })

    return Prisma.checkInAiJob.findFirstOrThrow({ where: { userId: user!.id } })
}

const statusOf = async (id: string) =>
    (await Prisma.checkInAiJob.findUniqueOrThrow({ where: { id } })).status

const purgeQueue = () => docker(`exec ${container} rabbitmqctl purge_queue -p /pulse pulse.checkin-ai`)

const waitForBroker = async () => {
    const up = await waitFor(async () => {
        try {
            docker(`exec ${container} rabbitmqctl await_startup`)

            return true
        } catch {
            return false
        }
    }, 60_000)
    if (!up) throw new Error('The broker did not come back')
}

describeWithBroker('Check-in AI jobs through a real broker — Integration', () => {
    let stop: (() => Promise<void>) | null = null

    beforeEach(() => {
        jest.spyOn(insightGenerationService, 'generateInsightForCheckIn').mockResolvedValue(undefined)
        jest.spyOn(recommendationsService, 'generateRecommendationsSafely').mockResolvedValue(undefined)
    })

    afterEach(async () => {
        await stop?.()
        stop = null
        await closeBroker()
    })

    it('publishes the job after the check-in is saved and a consumer finishes it', async () => {
        stop = startCheckInAiConsumer()
        const job = await createCheckIn()

        expect(await waitFor(async () => (await statusOf(job.id)) === 'DONE', 15_000)).toBe(true)
        expect(insightGenerationService.generateInsightForCheckIn).toHaveBeenCalledTimes(1)
    })

    it('has the sweeper publish a job whose message the broker lost', async () => {
        const job = await createCheckIn()
        // Wait for the request-path publish, then lose the message
        await waitFor(async () => (await Prisma.checkInAiJob.findUniqueOrThrow({ where: { id: job.id } })).publishedAt !== null, 10_000)
        purgeQueue()
        await Prisma.$executeRaw`
            UPDATE "CheckInAiJob"
            SET "publishedAt" = now() - interval '10 minutes',
                "updatedAt" = now() - interval '10 minutes'
            WHERE "id" = ${job.id}
        `

        stop = startCheckInAiConsumer()

        expect(await waitFor(async () => (await statusOf(job.id)) === 'DONE', 20_000)).toBe(true)
    })

    it('finishes a job that was in flight when the broker was killed and restarted', async () => {
        let release: () => void = () => undefined
        const started = new Promise<void>((resolve) => {
            jest.spyOn(insightGenerationService, 'generateInsightForCheckIn').mockImplementation(async () => {
                resolve()
                await new Promise<void>((done) => {
                    release = done
                })
            })
        })

        stop = startCheckInAiConsumer()
        const job = await createCheckIn()
        await started

        docker(`restart ${container}`)
        release()
        await waitForBroker()

        expect(await waitFor(async () => (await statusOf(job.id)) === 'DONE', 30_000)).toBe(true)
        // Nothing is left waiting in the queue once the redelivered message has been answered
        const left = await waitFor(async () => {
            const out = docker(`exec ${container} rabbitmqctl list_queues -p /pulse name messages_unacknowledged messages_ready`)

            return /pulse\.checkin-ai\s+0\s+0/.test(out)
        }, 20_000)
        expect(left).toBe(true)
    })
})
