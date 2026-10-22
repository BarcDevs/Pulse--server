import { dayInMs } from '../constants/time'

import { toLoggableError } from './loggableError'
import logger from './logger'

// Runs at startup and then daily. A single instance serves the app, so an
// in-process timer is enough; a missed day is caught by the next run.
export const scheduleDailyJob = (
    failureMessage: string,
    job: () => Promise<unknown>
) => {
    const run = () =>
        job().catch((error: unknown) =>
            logger.error(failureMessage, toLoggableError(error))
        )

    void run()

    setInterval(run, dayInMs).unref()
}
