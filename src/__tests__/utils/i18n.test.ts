import { t } from '../../utils/i18n'

describe('t()', () => {
    describe('no vars', () => {
        it('returns string unchanged when no vars passed', () => {
            expect(t('Hello world')).toBe('Hello world')
        })

        it('returns string unchanged when vars is undefined', () => {
            expect(t('Hello {{name}}', undefined))
                .toBe('Hello {{name}}')
        })
    })

    describe('interpolation', () => {
        it('replaces single placeholder', () => {
            expect(t('Your OTP is: {{otp}}', { otp: 123456 }))
                .toBe('Your OTP is: 123456')
        })

        it('replaces multiple placeholders', () => {
            expect(t('{{greeting}}, {{name}}!', {
                greeting: 'Hello',
                name: 'Bar'
            }))
                .toBe('Hello, Bar!')
        })

        it('replaces number var as string', () => {
            expect(t('Count: {{n}}', { n: 42 }))
                .toBe('Count: 42')
        })

        it('replaces same placeholder appearing twice', () => {
            expect(t('{{x}} and {{x}}', { x: 'foo' }))
                .toBe('foo and foo')
        })
    })

    describe('missing vars', () => {
        it('preserves placeholder when key is missing', () => {
            expect(t('Hello {{name}}', {}))
                .toBe('Hello {{name}}')
        })

        it('preserves unknown placeholder, replaces known one', () => {
            expect(t('{{a}} {{b}}', { a: 'hi' }))
                .toBe('hi {{b}}')
        })
    })

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(t('', { otp: 1 })).toBe('')
        })

        it('leaves non-placeholder braces untouched', () => {
            expect(t('{ not a placeholder }', { otp: 1 }))
                .toBe('{ not a placeholder }')
        })
    })
})
