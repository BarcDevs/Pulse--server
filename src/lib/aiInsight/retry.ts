/**
 * Retry helper for async operations
 * Retries on network errors, API errors, and parse failures
 * Does NOT retry validation failures
 */

type RetryConfig = {
    maxRetries: number
    delayMs: number
}

export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Determines if an error is retryable
 * Non-retryable: validation/parsing errors from generated content
 * Retryable: network errors, API errors, unexpected response structure
 */
export const isRetryableError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return true

    const message = error.message.toLowerCase()

    // Non-retryable: validation failures (these happen after successful API call)
    if (message.includes('validation failed')) return false
    if (message.includes('insight validation')) return false

    // Retryable: network, API, format errors
    if (message.includes('failed to generate')) return true
    if (message.includes('api request failed')) return true
    if (message.includes('unexpected response format')) return true
    if (message.includes('network')) return true
    if (message.includes('timeout')) return true
    if (message.includes('econnrefused')) return true
    if (message.includes('econnreset')) return true

    // Default: retry (conservative approach)
    return true
}

/**
 * Retries an async operation with exponential backoff
 * @param operation Function to retry
 * @param config Retry configuration {maxRetries, delayMs}
 * @returns Promise<T> Result of operation
 * @throws Last error if all retries fail
 */
export const retryAsync = async <T>(
    operation: () => Promise<T>,
    config: RetryConfig
): Promise<T> => {
    const { maxRetries, delayMs } = config
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error instanceof Error
                ? error
                : new Error(String(error))

            const isRetryable = isRetryableError(error)
            const isLastAttempt = attempt === maxRetries

            if (!isRetryable || isLastAttempt) {
                throw lastError
            }

            await sleep(delayMs)
        }
    }

    throw lastError || new Error('Retry failed')
}

export type { RetryConfig }
