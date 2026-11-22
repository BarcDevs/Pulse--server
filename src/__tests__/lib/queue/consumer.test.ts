import type { Channel, ConsumeMessage } from 'amqplib'

import { JOB_DEAD_EXCHANGE } from '../../../constants/jobQueue'
import type { JobOutcome } from '../../../lib/queue/consumer'
import { startConsumer } from '../../../lib/queue/consumer'

jest.mock('../../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

// A broker stand-in that, like the real one, hands out no more unacknowledged
// messages than the prefetch count.
const createFakeBroker = () => {
    const waiting: ConsumeMessage[] = []
    const unacknowledged = new Set<ConsumeMessage>()
    let prefetchCount = 1
    let deliver: ((message: ConsumeMessage) => void) | null = null
    let closeListener: (() => void) | null = null
    let counter = 0

    const pump = () => {
        while (deliver && unacknowledged.size < prefetchCount && waiting.length > 0) {
            const message = waiting.shift() as ConsumeMessage
            unacknowledged.add(message)
            deliver(message)
        }
    }

    const channel = {
        prefetch: jest.fn(async (count: number) => {
            prefetchCount = count
        }),
        consume: jest.fn(async (_queue: string, onMessage: (message: ConsumeMessage) => void) => {
            deliver = onMessage
            pump()

            return { consumerTag: 'tag-1' }
        }),
        cancel: jest.fn(async () => {
            deliver = null
        }),
        ack: jest.fn((message: ConsumeMessage) => {
            unacknowledged.delete(message)
            pump()
        }),
        nack: jest.fn((message: ConsumeMessage) => {
            unacknowledged.delete(message)
            pump()
        }),
        publish: jest.fn(() => true),
        on: jest.fn((event: string, listener: () => void) => {
            if (event === 'close') closeListener = listener
        }),
        close: jest.fn(async () => undefined)
    }

    return {
        channel: channel as unknown as Channel & typeof channel,
        send: (body: string) => {
            counter += 1
            waiting.push({
                content: Buffer.from(body),
                fields: { deliveryTag: counter },
                properties: {}
            } as unknown as ConsumeMessage)
            pump()
        },
        unacknowledgedCount: () => unacknowledged.size,
        dropConnection: () => closeListener?.()
    }
}

const tick = () => new Promise<void>(resolve => setImmediate(resolve))

const flush = async () => {
    for (let i = 0; i < 10; i += 1) await tick()
}

const baseOptions = (
    broker: ReturnType<typeof createFakeBroker>,
    handle: (jobId: string) => Promise<JobOutcome>,
    concurrency = 2
) => ({
    createChannel: async () => broker.channel,
    queue: 'pulse.checkin-ai',
    deadRoutingKey: 'checkin-ai',
    concurrency,
    handle,
    reconnectDelayMs: 10,
    shutdownWaitMs: 200
})

describe('startConsumer', () => {
    it('acknowledges only after the work has finished', async () => {
        const broker = createFakeBroker()
        let finish: (outcome: JobOutcome) => void = () => undefined
        const consumer = startConsumer(baseOptions(broker, () => new Promise<JobOutcome>(resolve => {
            finish = resolve
        })))
        await flush()

        broker.send('{"jobId":"job-1"}')
        await flush()
        expect(broker.channel.ack).not.toHaveBeenCalled()

        finish('done')
        await flush()
        expect(broker.channel.ack).toHaveBeenCalledTimes(1)

        await consumer.stop()
    })

    it('rejects without requeue when the handler asks for a retry, so the retry queue takes it', async () => {
        const broker = createFakeBroker()
        const consumer = startConsumer(baseOptions(broker, async () => 'retry'))
        await flush()

        broker.send('{"jobId":"job-1"}')
        await flush()

        expect(broker.channel.nack).toHaveBeenCalledWith(expect.anything(), false, false)
        expect(broker.channel.ack).not.toHaveBeenCalled()

        await consumer.stop()
    })

    it('treats a throwing handler as a retry', async () => {
        const broker = createFakeBroker()
        const consumer = startConsumer(baseOptions(broker, async () => {
            throw new Error('database is down')
        }))
        await flush()

        broker.send('{"jobId":"job-1"}')
        await flush()

        expect(broker.channel.nack).toHaveBeenCalledWith(expect.anything(), false, false)

        await consumer.stop()
    })

    it('moves a job whose attempts are used up to the dead-letter queue and acknowledges it', async () => {
        const broker = createFakeBroker()
        const consumer = startConsumer(baseOptions(broker, async () => 'dead'))
        await flush()

        broker.send('{"jobId":"job-1"}')
        await flush()

        expect(broker.channel.publish).toHaveBeenCalledWith(
            JOB_DEAD_EXCHANGE,
            'checkin-ai',
            expect.any(Buffer),
            { persistent: true }
        )
        expect(broker.channel.ack).toHaveBeenCalledTimes(1)

        await consumer.stop()
    })

    it('dead-letters a message that carries no job id without calling the handler', async () => {
        const broker = createFakeBroker()
        const handle = jest.fn(async (): Promise<JobOutcome> => 'done')
        const consumer = startConsumer(baseOptions(broker, handle))
        await flush()

        broker.send('not json')
        await flush()

        expect(handle).not.toHaveBeenCalled()
        expect(broker.channel.publish).toHaveBeenCalledTimes(1)

        await consumer.stop()
    })

    it('never has more jobs in flight than the concurrency setting', async () => {
        const broker = createFakeBroker()
        let running = 0
        let peak = 0
        const consumer = startConsumer(baseOptions(broker, async () => {
            running += 1
            peak = Math.max(peak, running)
            await new Promise(resolve => setTimeout(resolve, 20))
            running -= 1

            return 'done'
        }, 2))
        await flush()

        for (let i = 0; i < 6; i += 1) broker.send(`{"jobId":"job-${i}"}`)
        await new Promise(resolve => setTimeout(resolve, 200))

        expect(broker.channel.prefetch).toHaveBeenCalledWith(2)
        expect(peak).toBe(2)
        expect(broker.channel.ack).toHaveBeenCalledTimes(6)

        await consumer.stop()
    })

    it('stops taking messages and waits for the job in flight on shutdown', async () => {
        const broker = createFakeBroker()
        let finish: (outcome: JobOutcome) => void = () => undefined
        const consumer = startConsumer(baseOptions(broker, () => new Promise<JobOutcome>(resolve => {
            finish = resolve
        })))
        await flush()
        broker.send('{"jobId":"job-1"}')
        await flush()

        const stopping = consumer.stop()
        await flush()
        expect(broker.channel.cancel).toHaveBeenCalledWith('tag-1')
        expect(broker.channel.close).not.toHaveBeenCalled()

        finish('done')
        await stopping

        expect(broker.channel.ack).toHaveBeenCalledTimes(1)
        expect(broker.channel.close).toHaveBeenCalledTimes(1)
    })

    it('gives up waiting after the shutdown limit and leaves the message unacknowledged', async () => {
        const broker = createFakeBroker()
        const consumer = startConsumer(baseOptions(broker, () => new Promise<JobOutcome>(() => undefined)))
        await flush()
        broker.send('{"jobId":"job-1"}')
        await flush()

        await consumer.stop()

        expect(broker.channel.ack).not.toHaveBeenCalled()
        expect(broker.unacknowledgedCount()).toBe(1)
    })

    it('attaches again after the channel closes', async () => {
        const broker = createFakeBroker()
        const consumer = startConsumer(baseOptions(broker, async () => 'done'))
        await flush()

        broker.dropConnection()
        await new Promise(resolve => setTimeout(resolve, 50))

        expect(broker.channel.consume).toHaveBeenCalledTimes(2)

        await consumer.stop()
    })
})
