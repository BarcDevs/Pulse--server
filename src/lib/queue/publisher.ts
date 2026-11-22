import type { ConfirmChannel } from 'amqplib'

import { JOB_EXCHANGE } from '../../constants/jobQueue'

export type ChannelProvider = () => Promise<ConfirmChannel>

export class PublishError extends Error {}

// Messages carry the job id and nothing else: no check-in text, no health content.
export const buildJobMessage = (jobId: string): Buffer =>
    Buffer.from(JSON.stringify({ jobId }))

const withTimeout = <T>(
    work: Promise<T>,
    timeoutMs: number
): Promise<T> => new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
        () => reject(new PublishError(`No broker confirmation within ${timeoutMs} ms`)),
        timeoutMs
    )
    work.then(resolve, reject).finally(() => clearTimeout(timer))
})

// Resolves only after the broker confirmed the message. Rejects on a nack, a
// channel error or when the confirmation takes longer than timeoutMs, so a
// blocked broker cannot hang the request that published.
export const publishJob = async (
    getChannel: ChannelProvider,
    routingKey: string,
    jobId: string,
    timeoutMs: number
): Promise<void> => {
    const publishConfirmed = async () => {
        const channel = await getChannel()

        await new Promise<void>((resolve, reject) => {
            channel.publish(
                JOB_EXCHANGE,
                routingKey,
                buildJobMessage(jobId),
                { persistent: true, contentType: 'application/json' },
                (error) => (error ? reject(new PublishError(String(error))) : resolve())
            )
        })
    }

    await withTimeout(publishConfirmed(), timeoutMs)
}
