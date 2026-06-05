import winston from 'winston'

import logger from '../../utils/logger'

describe('Logger', () => {
    describe('logger configuration', () => {
        it('should be defined', () => {
            expect(logger).toBeDefined()
        })

        it('should be a winston logger instance', () => {
            expect(logger).toBeInstanceOf(winston.Logger)
        })

        it('should have transports configured', () => {
            expect(logger.transports).toBeDefined()
            expect(logger.transports.length)
                .toBeGreaterThan(0)
        })

        it('should have exactly 3 transports', () => {
            expect(logger.transports).toHaveLength(3)
        })

        it('should have error level transport', () => {
            const errorTransport = logger.transports.find(
                (t) => t.level === 'error'
            )
            expect(errorTransport).toBeDefined()
        })

        it('should have warn level transport', () => {
            const warnTransport = logger.transports.find(
                (t) => t.level === 'warn'
            )
            expect(warnTransport).toBeDefined()
        })
    })

    describe('logger methods', () => {
        it('should have error method', () => {
            expect(typeof logger.error).toBe('function')
        })

        it('should have warn method', () => {
            expect(typeof logger.warn).toBe('function')
        })

        it('should have info method', () => {
            expect(typeof logger.info).toBe('function')
        })

        it('should have debug method', () => {
            expect(typeof logger.debug).toBe('function')
        })
    })

    describe('logger format', () => {
        it('should have format configured', () => {
            expect(logger.format).toBeDefined()
        })
    })
})
