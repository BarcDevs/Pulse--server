import { jobsConfig, rabbitMqConfig } from '../../config'
import {
    CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS,
    CHECK_IN_AI_JOB_PUBLISH_BATCH,
    CHECK_IN_AI_JOB_PUBLISH_GRACE_MS,
    CHECK_IN_AI_JOB_PUBLISH_SWEEP_MS,
    CHECK_IN_AI_JOB_REPUBLISH_AFTER_MS,
    CHECK_IN_AI_JOB_SHUTDOWN_WAIT_MS,
    CHECK_IN_AI_JOB_STALE_MS,
    CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS
} from '../constants/checkInAiJob'
import {
    CHECK_IN_AI_QUEUE,
    CHECK_IN_AI_ROUTING_KEY,
    JOB_BACKEND_RABBITMQ
} from '../constants/jobQueue'
import {
    createConsumerChannel,
    getConfirmChannel,
    isBrokerConfigured
} from '../lib/queue/broker'
import type { JobOutcome } from '../lib/queue/consumer'
import { startConsumer } from '../lib/queue/consumer'
import { publishJob } from '../lib/queue/publisher'
import * as jobModel from '../models/checkInAiJobModel'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

import { runJob } from './checkInAiWorkerService'

// True when jobs travel through the broker. Without a broker host the setting is
// ignored, so a wrong value cannot leave jobs with no worker at all.
export const isBrokerBackend = (): boolean =>
    jobsConfig.backend === JOB_BACKEND_RABBITMQ && isBrokerConfigured()

// Resolves once the broker confirmed the message and the row says so.
export const publishJobById = async (jobId: string): Promise<void> => {
    await publishJob(
        getConfirmChannel,
        CHECK_IN_AI_ROUTING_KEY,
        jobId,
        rabbitMqConfig.publishTimeoutMs
    )
    await jobModel.markJobPublished(jobId)
}

// Logs only: the row stays pending and the sweeper publishes it later, so a
// broker problem never fails the request that saved the check-in.
export const tryPublishJob = async (jobId: string): Promise<void> => {
    try {
        await publishJobById(jobId)
    } catch (err: unknown) {
        logger.warn('Check-in AI job not published, the sweeper will retry', {
            jobId,
            error: toLoggableError(err)
        })
    }
}

// One message. A job that is gone from the table, already done, or running under
// a live claim has nothing left to do, so the message is just acknowledged: that
// is what makes a duplicate or redelivered message harmless.
export const handleJobMessage = async (jobId: string): Promise<JobOutcome> => {
    const job = await jobModel.claimJobById(jobId, CHECK_IN_AI_JOB_STALE_MS)

    if (!job) return 'done'

    return runJob(job)
}

export const sweepUnpublishedJobs = async (): Promise<number> => {
    const jobIds = await jobModel.findJobIdsToPublish(
        CHECK_IN_AI_JOB_PUBLISH_BATCH,
        CHECK_IN_AI_JOB_REPUBLISH_AFTER_MS,
        CHECK_IN_AI_JOB_PUBLISH_GRACE_MS
    )
    let published = 0

    for (const jobId of jobIds) {
        try {
            await publishJobById(jobId)
            published += 1
        } catch (err: unknown) {
            logger.warn('Check-in AI sweeper could not publish a job', {
                jobId,
                error: toLoggableError(err)
            })

            // The broker is not answering: leave the rest for the next round
            break
        }
    }

    return published
}

// Job age and queue depth, numbers only: no check-in text, no user data.
export const logQueueStats = async (): Promise<void> => {
    const stats = await jobModel.getQueueStats()

    logger.info('Check-in AI queue', {
        waiting: stats.waiting,
        oldestWaitingSeconds: stats.oldestWaitingSeconds
    })
}

const sweepOnce = async (): Promise<void> => {
    try {
        await jobModel.requeueMissedJobs(
            CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS,
            CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS
        )
        const published = await sweepUnpublishedJobs()

        if (published > 0) {
            logger.info('Check-in AI sweeper published jobs', { published })
        }

        await logQueueStats()
    } catch (err: unknown) {
        logger.error('Check-in AI queue sweep failed', toLoggableError(err))
    }
}

// Consumes from the broker and runs the sweeper. Returns the stop function:
// it stops taking messages, waits for the jobs in flight, then ends the sweeper.
export const startCheckInAiConsumer = (): (() => Promise<void>) => {
    const consumer = startConsumer({
        createChannel: createConsumerChannel,
        queue: CHECK_IN_AI_QUEUE,
        deadRoutingKey: CHECK_IN_AI_ROUTING_KEY,
        concurrency: jobsConfig.consumerConcurrency,
        handle: handleJobMessage,
        reconnectDelayMs: rabbitMqConfig.reconnectDelayMs,
        shutdownWaitMs: CHECK_IN_AI_JOB_SHUTDOWN_WAIT_MS
    })

    void sweepOnce()
    const timer = setInterval(() => void sweepOnce(), CHECK_IN_AI_JOB_PUBLISH_SWEEP_MS)

    return async () => {
        clearInterval(timer)
        await consumer.stop()
    }
}
