import type {
    Channel,
    ConsumeMessage
} from 'amqplib'

import { JOB_DEAD_EXCHANGE } from '../../constants/jobQueue'
import logger from '../../utils/logger'

// What a handler decides about one job:
//   done  - finished (or nothing left to do): acknowledge
//   retry - try again later: reject without requeue, the queue's dead-letter
//           exchange sends it to the retry queue, which returns it after its TTL
//   dead  - attempts used up: move to the dead-letter queue and acknowledge
export type JobOutcome = 'done' | 'retry' | 'dead'

export type JobHandler = (jobId: string) => Promise<JobOutcome>

export type ConsumerOptions = {
    createChannel: () => Promise<Channel>
    queue: string
    deadRoutingKey: string
    concurrency: number
    handle: JobHandler
    reconnectDelayMs: number
    shutdownWaitMs: number
}

export type RunningConsumer = {
    stop: () => Promise<void>
}

const parseJobId = (message: ConsumeMessage): string | null => {
    try {
        const parsed = JSON.parse(message.content.toString()) as { jobId?: unknown }

        return typeof parsed.jobId === 'string' && parsed.jobId !== '' ? parsed.jobId : null
    } catch {
        return null
    }
}

const sleep = (ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms).unref()
})

// The acknowledgement always comes after the work. Messages are delivered at
// most `concurrency` at a time (prefetch), so that is also the most jobs in flight.
export const startConsumer = (options: ConsumerOptions): RunningConsumer => {
    let stopped = false
    let channel: Channel | null = null
    let consumerTag: string | null = null
    const inFlight = new Set<Promise<void>>()

    const settle = (current: Channel, message: ConsumeMessage, outcome: JobOutcome) => {
        if (outcome === 'done') {
            current.ack(message)
        } else if (outcome === 'retry') {
            current.nack(message, false, false)
        } else {
            current.publish(
                JOB_DEAD_EXCHANGE,
                options.deadRoutingKey,
                message.content,
                { persistent: true }
            )
            current.ack(message)
        }
    }

    const handleMessage = async (current: Channel, message: ConsumeMessage) => {
        const jobId = parseJobId(message)
        let outcome: JobOutcome = 'dead'

        if (jobId) {
            try {
                outcome = await options.handle(jobId)
            } catch (error) {
                logger.error(`Job consumer handler failed: ${(error as Error).message}`)
                outcome = 'retry'
            }
        } else {
            logger.error('Job consumer got a message without a job id, moving it to the dead-letter queue')
        }

        try {
            settle(current, message, outcome)
        } catch (error) {
            // The channel is gone: the broker redelivers the unacknowledged message
            logger.warn(`Job consumer could not settle a message: ${(error as Error).message}`)
        }
    }

    const keepAttached = async (): Promise<void> => {
        while (!stopped) {
            try {
                const current = await options.createChannel()
                channel = current
                await current.prefetch(options.concurrency)

                const reply = await current.consume(options.queue, (message) => {
                    if (!message) return
                    const work: Promise<void> = handleMessage(current, message)
                        .finally(() => inFlight.delete(work))
                    inFlight.add(work)
                })
                consumerTag = reply.consumerTag

                current.on('close', () => {
                    channel = null
                    consumerTag = null
                    if (!stopped) void keepAttached()
                })

                return
            } catch (error) {
                logger.warn(`Job consumer could not attach: ${(error as Error).message}`)
                await sleep(options.reconnectDelayMs)
            }
        }
    }

    void keepAttached()

    return {
        // Stops taking new messages, waits for the jobs in flight, then closes the channel.
        // A job still running after shutdownWaitMs is left unacknowledged: the broker
        // redelivers it and the stale claim in the table lets another consumer take it over.
        stop: async () => {
            stopped = true

            if (channel && consumerTag) {
                await channel.cancel(consumerTag).catch(() => undefined)
            }

            await Promise.race([
                Promise.allSettled([...inFlight]),
                sleep(options.shutdownWaitMs)
            ])

            await channel?.close().catch(() => undefined)
        }
    }
}
