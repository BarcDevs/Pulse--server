// @ts-nocheck
import { sendEmail } from '../../utils/emailSender'

describe('Email Sender', () => {
    describe('sendEmail', () => {
        it('should be defined', () => {
            expect(sendEmail).toBeDefined()
        })

        it('should be a function', () => {
            expect(typeof sendEmail).toBe('function')
        })

        it('should not throw when called with valid parameters (mocked)', () => {
            expect(() => {
                sendEmail('test@test.com', 'Subject', 'Body')
            }).not.toThrow()
        })

        it('should handle empty string parameters (mocked)', () => {
            expect(() => {
                sendEmail('', '', '')
            }).not.toThrow()
        })
    })
})
