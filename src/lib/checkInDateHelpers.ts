import logger from '../utils/logger'

export const toDateStr = (d: Date): string =>
    d.toISOString().slice(0, 10)

export const prevDay = (dateStr: string): string => {
    const d = new Date(`${dateStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return toDateStr(d)
}

export const resolveCheckInDate = (
    timezone?: string | null
): Date => {
    const timezoneName = timezone ?? 'UTC'

    try {
        const dateStr = new Intl
            .DateTimeFormat(
                'en-CA',
                {
                    timeZone: timezoneName,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            ).format(new Date())
        return new Date(
            `${dateStr}T00:00:00Z`
        )
    } catch {
        logger.warn(
            `Invalid timezone '${timezoneName}' - falling back to UTC`
        )
        const today = new Date()
        // eslint-disable-next-line custom-rules/enforce-function-call-breaking
        today.setUTCHours(0, 0, 0, 0)
        return today
    }
}

export const resolveTimestampInUserTimeZone = (
    timezone?: string | null
): Date => {
    const timezoneName = timezone ?? 'UTC'

    try {
        const now = new Date()
        const dateFormatter = new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: timezoneName,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }
        )

        const parts = dateFormatter
            .formatToParts(now)
        const year = parseInt(
            parts.find((p) => p.type === 'year')
                ?.value ?? '2000'
        )
        const month = parseInt(
            parts.find((p) => p.type === 'month')
                ?.value ?? '1'
        ) - 1
        const day = parseInt(
            parts.find((p) => p.type === 'day')
                ?.value ?? '1'
        )
        const hour = parseInt(
            parts.find((p) => p.type === 'hour')
                ?.value ?? '0'
        )
        const minute = parseInt(
            parts.find((p) => p.type === 'minute')
                ?.value ?? '0'
        )
        const second = parseInt(
            parts.find((p) => p.type === 'second')
                ?.value ?? '0'
        )

        return new Date(
            year,
            month,
            day,
            hour,
            minute,
            second
        )
    } catch {
        logger.warn(
            `Invalid timezone '${timezoneName}' - falling back to UTC`
        )
        return new Date()
    }
}

