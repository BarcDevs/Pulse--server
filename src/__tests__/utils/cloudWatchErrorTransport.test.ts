import type { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'

import { secondInMs } from '../../constants/time'
import {
    cloudWatchBatchSize,
    CloudWatchErrorTransport,
    cloudWatchFlushIntervalMs } from '../../utils/cloudWatchErrorTransport'

const logGroupName = '/pulse/test-errors'

const createTransport = (send: jest.Mock) =>
    new CloudWatchErrorTransport({
        logGroupName,
        client: { send } as unknown as CloudWatchLogsClient
    })

const logError = (
    transport: CloudWatchErrorTransport,
    message: string
) => transport.log(
    {
        level: 'error',
        message,
        metadata: { code: 1 },
        timestamp: '2026-10-28T10:00:00.000Z'
    },
    jest.fn()
)

const sentInputs = (send: jest.Mock) =>
    send.mock.calls.map(([command]) => command.input)

describe('CloudWatchErrorTransport', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('creates the log stream once and ships queued errors as JSON lines after the flush interval', async () => {
        const send = jest.fn().mockResolvedValue({})
        const transport = createTransport(send)

        logError(transport, 'first')
        logError(transport, 'second')
        await jest.advanceTimersByTimeAsync(
            cloudWatchFlushIntervalMs
        )

        const [createInput, putInput] = sentInputs(send)
        expect(createInput.logGroupName).toBe(logGroupName)
        expect(putInput.logGroupName).toBe(logGroupName)
        expect(putInput.logStreamName)
            .toBe(createInput.logStreamName)
        expect(putInput.logEvents).toHaveLength(2)
        expect(JSON.parse(putInput.logEvents[0].message))
            .toEqual({
                level: 'error',
                message: 'first',
                metadata: { code: 1 },
                timestamp: '2026-10-28T10:00:00.000Z'
            })

        logError(transport, 'third')
        await jest.advanceTimersByTimeAsync(
            cloudWatchFlushIntervalMs
        )

        expect(sentInputs(send)).toHaveLength(3)
    })

    it('flushes immediately when a full batch is queued', async () => {
        const send = jest.fn().mockResolvedValue({})
        const transport = createTransport(send)

        for (let n = 0; n < cloudWatchBatchSize; n++)
            logError(transport, `error ${n}`)
        await jest.advanceTimersByTimeAsync(0)

        const putInput = sentInputs(send)[1]
        expect(putInput.logEvents)
            .toHaveLength(cloudWatchBatchSize)
    })

    it('tolerates a stream that already exists', async () => {
        const send = jest
            .fn()
            .mockRejectedValueOnce(
                Object.assign(new Error('exists'), {
                    name: 'ResourceAlreadyExistsException'
                })
            )
            .mockResolvedValue({})
        const transport = createTransport(send)

        logError(transport, 'boom')
        await jest.advanceTimersByTimeAsync(
            cloudWatchFlushIntervalMs
        )

        expect(sentInputs(send)).toHaveLength(2)
    })

    it('drops the batch and keeps running when CloudWatch rejects it', async () => {
        const stderr = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true)
        const send = jest
            .fn()
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('AccessDenied'))
            .mockResolvedValue({})
        const transport = createTransport(send)

        logError(transport, 'lost')
        await jest.advanceTimersByTimeAsync(
            cloudWatchFlushIntervalMs
        )
        logError(transport, 'kept')
        await jest.advanceTimersByTimeAsync(
            cloudWatchFlushIntervalMs
        )

        expect(stderr).toHaveBeenCalled()
        const lastPut = sentInputs(send).at(-1)
        expect(lastPut.logEvents).toHaveLength(1)
        expect(JSON.parse(lastPut.logEvents[0].message).message)
            .toBe('kept')
        stderr.mockRestore()
    })

    it('flushes what is queued when closed', async () => {
        const send = jest.fn().mockResolvedValue({})
        const transport = createTransport(send)

        logError(transport, 'last words')
        transport.close()
        await jest.advanceTimersByTimeAsync(secondInMs)

        const putInput = sentInputs(send)[1]
        expect(putInput.logEvents).toHaveLength(1)
    })
})
