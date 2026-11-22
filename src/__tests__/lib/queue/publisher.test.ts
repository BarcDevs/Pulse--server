import type { ConfirmChannel } from 'amqplib'

import { JOB_EXCHANGE } from '../../../constants/jobQueue'
import {
    buildJobMessage,
    PublishError,
    publishJob
} from '../../../lib/queue/publisher'

type ConfirmCallback = (error: unknown, ok: object) => void

const fakeChannel = (behaviour: (callback: ConfirmCallback) => void) => {
    const publish = jest.fn((
        _exchange: string,
        _key: string,
        _content: Buffer,
        _options: object,
        callback: ConfirmCallback
    ) => {
        behaviour(callback)

        return true
    })

    return { publish } as unknown as ConfirmChannel & { publish: jest.Mock }
}

describe('publishJob', () => {
    it('resolves after the broker confirms and sends a persistent message with only the job id', async () => {
        const channel = fakeChannel(callback => callback(null, {}))

        await publishJob(async () => channel, 'checkin-ai', 'job-1', 1000)

        const [exchange, key, content, options] = channel.publish.mock.calls[0]
        expect(exchange).toBe(JOB_EXCHANGE)
        expect(key).toBe('checkin-ai')
        expect(JSON.parse(content.toString())).toEqual({ jobId: 'job-1' })
        expect(options).toMatchObject({ persistent: true })
    })

    it('rejects when the broker nacks the message', async () => {
        const channel = fakeChannel(callback => callback(new Error('nack'), {}))

        await expect(
            publishJob(async () => channel, 'checkin-ai', 'job-1', 1000)
        ).rejects.toBeInstanceOf(PublishError)
    })

    it('rejects when no confirmation arrives within the timeout', async () => {
        const channel = fakeChannel(() => undefined)

        await expect(
            publishJob(async () => channel, 'checkin-ai', 'job-1', 50)
        ).rejects.toThrow('No broker confirmation within 50 ms')
    })

    it('rejects when no channel can be opened', async () => {
        await expect(
            publishJob(() => Promise.reject(new Error('connect ECONNREFUSED')), 'checkin-ai', 'job-1', 1000)
        ).rejects.toThrow('ECONNREFUSED')
    })

    it('does not put anything but the id in the message', () => {
        expect(buildJobMessage('abc').toString()).toBe('{"jobId":"abc"}')
    })
})
