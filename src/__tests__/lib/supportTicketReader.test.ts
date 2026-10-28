import { supportTicketExcerptMaxLength } from '../../constants/support/supportTickets'
import {
    maskEmail,
    toReaderTicketDetail,
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
        ['a www url', 'see www.example.com/page ok', 'see [link] ok'],
        ['a bare domain link with a path', 'see app.example.com/reset?t=1 ok', 'see [link] ok'],
        ['a bare domain link with a query', 'see example.com?token=abc ok', 'see [link] ok']
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

describe('toReaderTicketDetail', () => {
    const createTicket = (message: string) => ({
        id: 'ticket-1',
        topic: 'technical',
        message,
        senderEmail: 'visitor@test.com',
        userId: 'user-1',
        status: 'NEW' as const,
        createdAt: new Date('2026-10-01T10:00:00Z'),
        updatedAt: new Date('2026-10-02T10:00:00Z'),
        closedAt: null
    })

    it('returns only the allow-listed fields with a masked email', () => {
        const detail = toReaderTicketDetail(createTicket('hello'))

        expect(Object.keys(detail).sort()).toEqual([
            'createdAt',
            'id',
            'message',
            'senderEmail',
            'status',
            'topic'
        ])
        expect(detail.senderEmail).toBe('v***@test.com')
    })

    it('keeps a long message whole, with no cut', () => {
        const message = 'word '.repeat(200).trim()

        expect(toReaderTicketDetail(createTicket(message)).message)
            .toBe(message)
    })

    it('redacts emails, phones and long numbers', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'mail me at a@b.com or call 050-123-4567, id 1234567890123'
        ))

        expect(message)
            .toBe('mail me at [email] or call [number], id [number]')
    })

    it('cuts a url to its domain and first path segment', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'see https://app.example.com/goals/abc/def?token=secret#x now'
        ))

        expect(message).toBe('see app.example.com/goals now')
    })

    it('keeps only the domain for a url with no path', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'go to www.example.com?session=1, thanks'
        ))

        expect(message).toBe('go to www.example.com, thanks')
    })

    it('drops credentials and the query from a url', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'https://user:pw@example.com/path?e=a@b.com'
        ))

        expect(message).toBe('example.com/path')
    })

    it('redacts a long number left in the first path segment', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'https://example.com/1234567890123/x'
        ))

        expect(message).toBe('example.com/[number]')
    })

    it('cuts a bare domain link to its domain and first path segment', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'open app.example.com/reset/abc?token=secret now'
        ))

        expect(message).toBe('open app.example.com/reset now')
    })

    it.each([
        ['a file name', 'open notes.txt now'],
        ['a version', 'running v1.2.3 now'],
        ['a path with no dot', 'open the dashboard/settings page']
    ])('leaves %s unchanged', (_name, text) => {
        expect(toReaderTicketDetail(createTicket(text)).message)
            .toBe(text)
    })

    it('still redacts an email followed by a path as an email', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'mail a@b.com/x now'
        ))

        expect(message).toBe('mail [email] now')
    })

    it('does not leak credentials left with nothing after them', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'try https://admin:hunter2@ now'
        ))

        expect(message).toBe('try [link] now')
    })

    it('keeps only the text after the last @ in the authority', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'try https://u:p@ss@host.com/x now'
        ))

        expect(message).toBe('try host.com/x now')
    })

    it('shortens a link with an uppercase scheme', () => {
        const { message } = toReaderTicketDetail(createTicket(
            'see HTTPS://Example.com/Path/Deep?t=1'
        ))

        expect(message).toBe('see Example.com/Path')
    })

    it('puts back the punctuation that ended the sentence', () => {
        const { message } = toReaderTicketDetail(createTicket(
            '(see https://example.com/a/b?x=1).'
        ))

        expect(message).toBe('(see example.com/a).')
    })
})
