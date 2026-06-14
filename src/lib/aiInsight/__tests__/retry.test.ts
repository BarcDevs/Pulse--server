import {
    isRetryableError,
    retryAsync,
    sleep
} from '../retry'

describe('retry utilities', () => {
    describe('sleep', () => {
        it('should delay for specified milliseconds', async () => {
            const start = Date.now()
            await sleep(50)
            const elapsed = Date.now() - start

            expect(elapsed).toBeGreaterThanOrEqual(45)
            expect(elapsed).toBeLessThan(200)
        })
    })

    describe('isRetryableError', () => {
        it('should return true for network errors', () => {
            expect(
                isRetryableError(
                    new Error('Network error occurred')
                )
            ).toBe(true)

            expect(
                isRetryableError(
                    new Error('ECONNREFUSED: connection refused')
                )
            ).toBe(true)

            expect(
                isRetryableError(
                    new Error('ECONNRESET: socket hang up')
                )
            ).toBe(true)

            expect(
                isRetryableError(
                    new Error('timeout waiting for response')
                )
            ).toBe(true)
        })

        it('should return true for API errors', () => {
            expect(
                isRetryableError(
                    new Error('API request failed with 500')
                )
            ).toBe(true)

            expect(
                isRetryableError(
                    new Error('Failed to generate content from Google AI: 429')
                )
            ).toBe(true)
        })

        it('should return true for unexpected response format', () => {
            expect(
                isRetryableError(
                    new Error('Unexpected response format from Google AI API')
                )
            ).toBe(true)
        })

        it('should return false for validation failures', () => {
            expect(
                isRetryableError(
                    new Error('validation failed: content too short')
                )
            ).toBe(false)

            expect(
                isRetryableError(
                    new Error('Insight validation failed')
                )
            ).toBe(false)
        })

        it('should return true for unknown errors (conservative)', () => {
            expect(isRetryableError(new Error('Some weird error'))).toBe(true)
            expect(isRetryableError('string error')).toBe(true)
            expect(isRetryableError(123)).toBe(true)
        })
    })

    describe('retryAsync', () => {
        it('should succeed on first attempt', async () => {
            const operation = jest.fn()
                .mockResolvedValueOnce({ success: true })

            const result = await retryAsync(
                operation,
                { maxRetries: 2, delayMs: 10 }
            )

            expect(result).toEqual({ success: true })
            expect(operation).toHaveBeenCalledTimes(1)
        })

        it('should retry on retryable error and succeed', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(
                    new Error('Network error')
                )
                .mockResolvedValueOnce({ success: true })

            const result = await retryAsync(
                operation,
                { maxRetries: 2, delayMs: 10 }
            )

            expect(result).toEqual({ success: true })
            expect(operation).toHaveBeenCalledTimes(2)
        })

        it('should retry multiple times before success', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(
                    new Error('Network error 1')
                )
                .mockRejectedValueOnce(
                    new Error('Network error 2')
                )
                .mockResolvedValueOnce({ success: true })

            const result = await retryAsync(
                operation,
                { maxRetries: 2, delayMs: 10 }
            )

            expect(result).toEqual({ success: true })
            expect(operation).toHaveBeenCalledTimes(3)
        })

        it('should not retry non-retryable errors', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(
                    new Error('Validation failed')
                )

            await expect(
                retryAsync(
                    operation,
                    { maxRetries: 2, delayMs: 10 }
                )
            ).rejects.toThrow('Validation failed')

            expect(operation).toHaveBeenCalledTimes(1)
        })

        it('should exhaust retries and throw last error', async () => {
            const operation = jest.fn()
                .mockRejectedValue(
                    new Error('API request failed')
                )

            await expect(
                retryAsync(
                    operation,
                    { maxRetries: 2, delayMs: 10 }
                )
            ).rejects.toThrow('API request failed')

            expect(operation).toHaveBeenCalledTimes(3)
        })

        it('should respect maxRetries configuration', async () => {
            const operation = jest.fn()
                .mockRejectedValue(
                    new Error('Network error')
                )

            await expect(
                retryAsync(
                    operation,
                    { maxRetries: 1, delayMs: 10 }
                )
            ).rejects.toThrow()

            expect(operation).toHaveBeenCalledTimes(2)
        })

        it('should stop retrying after first non-retryable error', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(
                    new Error('Network error (retryable)')
                )
                .mockRejectedValueOnce(
                    new Error('Validation failed (non-retryable)')
                )
                .mockResolvedValueOnce({ success: true })

            await expect(
                retryAsync(
                    operation,
                    { maxRetries: 2, delayMs: 10 }
                )
            ).rejects.toThrow('Validation failed')

            expect(operation).toHaveBeenCalledTimes(2)
        })

        it('should handle non-Error throws', async () => {
            let callCount = 0
            const operation = jest.fn(async () => {
                callCount++
                throw 'string error'
            })

            await expect(
                retryAsync(
                    operation,
                    { maxRetries: 2, delayMs: 10 }
                )
            ).rejects.toBeDefined()

            expect(callCount).toBe(3)
        })

        it('should apply delay between retries', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(
                    new Error('Network error 1')
                )
                .mockRejectedValueOnce(
                    new Error('Network error 2')
                )
                .mockResolvedValueOnce({ success: true })

            const start = Date.now()
            await retryAsync(
                operation,
                { maxRetries: 2, delayMs: 50 }
            )
            const elapsed = Date.now() - start

            // 2 retries × 50ms = 100ms minimum
            expect(elapsed).toBeGreaterThanOrEqual(100)
        })
    })
})
