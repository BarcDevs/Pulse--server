import os from 'os'
import type { LogEntry } from 'winston'
import Transport from 'winston-transport'

import {
    CloudWatchLogsClient,
    CreateLogStreamCommand,
    PutLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs'

import { secondInMs } from '../constants/time'

export const cloudWatchFlushIntervalMs = 5 * secondInMs
export const cloudWatchBatchSize = 500
const maxQueuedEvents = 1000
const streamExistsErrorName = 'ResourceAlreadyExistsException'

type CloudWatchErrorTransportOptions = {
    logGroupName: string
    region?: string
    client?: CloudWatchLogsClient
}

type QueuedEvent = {
    timestamp: number
    message: string
}

// Ships error-level lines to one CloudWatch log group, one JSON object
// per event (same shape as the stdout lines the watcher parses). Failures
// go to stderr, never back through the logger, and the queue is capped,
// so a CloudWatch outage can't loop or grow memory
export class CloudWatchErrorTransport extends Transport {
    private readonly client: CloudWatchLogsClient
    private readonly logGroupName: string
    private readonly logStreamName =
        `${os.hostname()}-${Date.now()}`
    private queue: QueuedEvent[] = []
    private timer?: NodeJS.Timeout
    private isFlushing = false
    private isStreamCreated = false

    constructor({
        logGroupName,
        region,
        client
    }: CloudWatchErrorTransportOptions) {
        super({ level: 'error' })
        this.logGroupName = logGroupName
        this.client = client ?? new CloudWatchLogsClient({ region })
    }

    log(info: LogEntry, callback: () => void) {
        const {
            level,
            message,
            metadata
        } = info
        const now = Date.now()
        // The logger's metadata() format moves winston's timestamp under
        // `metadata`; stdout lines get a top-level one from the console
        // transport, and the watcher filters on it, so add it here too
        this.queue.push({
            timestamp: now,
            message: JSON.stringify({
                level,
                message,
                metadata,
                timestamp: new Date(now).toISOString()
            })
        })
        if (this.queue.length > maxQueuedEvents)
            this.queue.shift()

        if (this.queue.length >= cloudWatchBatchSize)
            void this.flush()
        else this.scheduleFlush()

        callback()
    }

    close() {
        clearTimeout(this.timer)
        void this.flush()
    }

    private scheduleFlush() {
        if (this.timer) return

        this.timer = setTimeout(
            () => void this.flush(),
            cloudWatchFlushIntervalMs
        )
        this.timer.unref()
    }

    private async flush() {
        clearTimeout(this.timer)
        this.timer = undefined
        if (this.isFlushing || !this.queue.length) return

        this.isFlushing = true
        const batch = this.queue.splice(0, cloudWatchBatchSize)
        try {
            await this.ensureStream()
            await this.client.send(
                new PutLogEventsCommand({
                    logGroupName: this.logGroupName,
                    logStreamName: this.logStreamName,
                    logEvents: batch
                })
            )
        } catch (error) {
            process.stderr.write(
                `CloudWatch error log shipping failed: ${String(error)}\n`
            )
        } finally {
            this.isFlushing = false
            if (this.queue.length) this.scheduleFlush()
        }
    }

    private async ensureStream() {
        if (this.isStreamCreated) return

        try {
            await this.client.send(
                new CreateLogStreamCommand({
                    logGroupName: this.logGroupName,
                    logStreamName: this.logStreamName
                })
            )
        } catch (error) {
            if ((error as Error).name !== streamExistsErrorName)
                throw error
        }
        this.isStreamCreated = true
    }
}
