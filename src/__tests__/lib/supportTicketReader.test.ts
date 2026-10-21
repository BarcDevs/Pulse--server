import { supportTicketExcerptMaxLength } from '../../constants/support/supportTickets'
import {
    maskEmail,
    toTicketExcerpt
} from '../../lib/supportTicketReader'

describe('maskEmail', () => {
    it('keeps the first character and the domain', () => {
        expect(maskEmail('visitor@test.com')).toBe('v***@test.com')
    })

    it('masks a one-character local part the same way', () => {
        expect(maskEmail('a@test.com')).toBe('a***@test.com')
    })

    it('uses the last @ when the local part contains one', () => {
        expect(maskEmail('"a@b"@test.com')).toBe('"***@test.com')
    })

    it.each([
        ['no @', 'not-an-email'],
        ['an empty local part', '@test.com'],
        ['an empty string', '']
    ])('reveals nothing for %s', (_name, value) => {
        expect(maskEmail(value)).toBe('***')
    })
})

describe('toTicketExcerpt', () => {
    it('keeps a message at the limit whole', () => {
        const message = 'a'.repeat(supportTicketExcerptMaxLength)

        expect(toTicketExcerpt(message)).toBe(message)
    })

    it('cuts a longer message and marks the cut', () => {
        const message = 'a'.repeat(supportTicketExcerptMaxLength + 1)

        expect(toTicketExcerpt(message))
            .toBe(`${'a'.repeat(supportTicketExcerptMaxLength)}...`)
    })

    it('drops trailing spaces before the mark', () => {
        const message = `${'a'.repeat(supportTicketExcerptMaxLength - 1)} tail`

        expect(toTicketExcerpt(message))
            .toBe(`${'a'.repeat(supportTicketExcerptMaxLength - 1)}...`)
    })
})
