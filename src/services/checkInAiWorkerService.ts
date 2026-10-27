import {
    CHECK_IN_AI_JOB_CONCURRENCY,
    CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS,
    CHECK_IN_AI_JOB_MAX_ATTEMPTS,
    CHECK_IN_AI_JOB_POLL_MS,
    CHECK_IN_AI_JOB_SHUTDOWN_WAIT_MS,
    CHECK_IN_AI_JOB_STALE_MS,
    CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS,
    CHECK_IN_AI_JOB_SWEEP_MS
} from '../constants/checkInAiJob'
import type { ClaimedCheckInAiJob } from '../models/checkInAiJobModel'
import * as jobModel from '../models/checkInAiJobModel'
import { toLoggableError } from '../utils/loggableError'
import logger from '../utils/logger'

import { generateInsightForCheckIn } from './insightGenerationService'
import { generateRecommendationsSafely } from './recommendationsService'

const runJob = async (job: ClaimedCheckInAiJob): Promise<void> => {
    try {
        // Throws on infrastructure errors so the job is retried; an AI failure
        // never throws here, the insight service stores the template fallback.
        const holdsClaim = () => jobModel.holdsClaim(job)

        await generateInsightForCheckIn(
            job.userId,
            job.checkInId,
            holdsClaim
        )
        await generateRecommendationsSafely(
            job.userId,
            job.checkInId,
            holdsClaim
        )
        await jobModel.markJobDone(job)
    } catch (err: unknown) {
        const loggable = toLoggableError(err)
        const reason = [loggable.name, loggable.code]
            .filter(Boolean)
            .join(' ')
        const exhausted = job.attempts >= CHECK_IN_AI_JOB_MAX_ATTEMPTS

        logger.error('Check-in AI job failed', {
            jobId: job.id,
            checkInId: job.checkInId,
            attempts: job.attempts,
            exhausted,
            error: loggable
        })

        if (exhausted)
            await jobModel.markJobFailed(job, reason)
        else
            await jobModel.markJobRetry(job, reason)
    }
}

// Claims and runs jobs until none is claimable or shouldStop says so; returns how many ran
export const drainJobs = async (
    shouldStop: () => boolean = () => false
): Promise<number> => {
    let processed = 0

    while (!shouldStop()) {
        const job = await jobModel.claimNextJob(CHECK_IN_AI_JOB_STALE_MS)

        if (!job) return processed

        try {
            await runJob(job)
        } catch (err: unknown) {
            // Bookkeeping failed (e.g. database down): the job stays RUNNING
            // and is taken over after the stale timeout
            logger.error('Check-in AI job bookkeeping failed', {
                jobId: job.id,
                error: toLoggableError(err)
            })
        }

        processed += 1
    }

    return processed
}

const sweepMissedJobs = async (): Promise<void> => {
    try {
        await jobModel.requeueMissedJobs(
            CHECK_IN_AI_JOB_SWEEP_LOOKBACK_MS,
            CHECK_IN_AI_JOB_FAILED_RETRY_AFTER_MS
        )
    } catch (err: unknown) {
        logger.error('Check-in AI sweep failed', toLoggableError(err))
    }
}

// Several instances may run this; claiming is atomic, so each job runs once.
// The returned stop function ends polling and resolves once the jobs in
// flight finish (or after the shutdown wait), so the caller can disconnect
// the database afterwards.
export const startCheckInAiWorker = (): (() => Promise<void>) => {
    let stopped = false
    let running = false
    let inFlight: Promise<void> = Promise.resolve()

    const tick = () => {
        if (stopped || running) return

        running = true

        inFlight = Promise.allSettled(
            Array.from(
                { length: CHECK_IN_AI_JOB_CONCURRENCY },
                () => drainJobs(() => stopped)
            )
        )
            .then((settled) => {
                settled.forEach((result) => {
                    if (result.status === 'rejected')
                        logger.error(
                            'Check-in AI worker drain failed',
                            toLoggableError(result.reason)
                        )
                })
            })
            .finally(() => {
                running = false
            })
    }

    sweepMissedJobs()

    tick()

    const timer = setInterval(tick, CHECK_IN_AI_JOB_POLL_MS)
    const sweepTimer = setInterval(sweepMissedJobs, CHECK_IN_AI_JOB_SWEEP_MS)

    return async () => {
        stopped = true
        clearInterval(timer)
        clearInterval(sweepTimer)

        await Promise.race([
            inFlight,
            new Promise<void>((resolve) =>
                setTimeout(resolve, CHECK_IN_AI_JOB_SHUTDOWN_WAIT_MS).unref())
        ])
    }
}
