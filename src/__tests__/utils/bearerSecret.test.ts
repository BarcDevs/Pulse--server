import { isBearerSecretValid } from '../../utils/bearerSecret'

const secret = 'a-shared-secret-of-20-chars'
const minLength = 16

describe('isBearerSecretValid', () => {
    it('accepts the matching Bearer secret', () => {
        expect(isBearerSecretValid(
            `Bearer ${secret}`,
            secret,
            minLength
        )).toBe(true)
    })

    it.each([
        ['no header', undefined],
        ['an empty header', ''],
        ['a wrong secret', 'Bearer not-the-right-secret-at-all'],
        ['a non-Bearer scheme', `Basic ${secret}`],
        ['an empty Bearer value', 'Bearer '],
        ['a prefix of the secret', `Bearer ${secret.slice(0, 10)}`]
    ])('rejects %s', (_name, header) => {
        expect(isBearerSecretValid(header, secret, minLength))
            .toBe(false)
    })

    it('rejects everything while the secret is unset', () => {
        expect(isBearerSecretValid('Bearer ', '', minLength))
            .toBe(false)
    })

    it('rejects a secret shorter than the minimum, even if it matches', () => {
        expect(isBearerSecretValid('Bearer short', 'short', minLength))
            .toBe(false)
    })
})
