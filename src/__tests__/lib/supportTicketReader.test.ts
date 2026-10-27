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

describe('toTicketExcerpt redaction', () => {
    it.each([
        ['an email', 'write me at jane.doe@test.com now', 'write me at [email] now'],
        ['a local phone', 'call 052-123-4567 please', 'call [number] please'],
        ['an international phone', 'call +972 52 123 4567 please', 'call [number] please'],
        ['a phone with parentheses', 'call (052) 123-4567 please', 'call [number] please'],
        ['a phone with spaced dashes', 'call 052 - 123 - 4567 please', 'call [number] please'],
        ['a long digit run', 'card 1234567890123 ok', 'card [number] ok'],
        ['an http url', 'see https://example.com/a?b=1 ok', 'see [link] ok'],
        ['a www url', 'see www.example.com/page ok', 'see [link] ok']
    ])('redacts %s', (_name, message, expected) => {
        expect(toTicketExcerpt(message)).toBe(expected)
    })

    it('does not leak an email straddling the limit', () => {
        const message = `${'a'.repeat(supportTicketExcerptMaxLength - 5)} jane@test.com`
        const excerpt = toTicketExcerpt(message)

        expect(excerpt).not.toContain('jane')
        expect(excerpt).not.toContain('@')
    })

    it('does not leak a number straddling the limit', () => {
        const message = `${'a '.repeat(58)}0521234567890`
        const excerpt = toTicketExcerpt(message)

        expect(excerpt).not.toMatch(/\d{3}/)
    })

    it('leaves plain text with short numbers unchanged', () => {
        const message = 'I have 3 posts and 12 followers since 2024'

        expect(toTicketExcerpt(message)).toBe(message)
    })
})
