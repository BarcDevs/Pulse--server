import type { SupportTicket } from '../../prisma/generated/prisma/client'
import {
    emailRedactionPattern,
    linkRedactionPattern,
    linkShortenPattern,
    linkTrailingPunctuationPattern,
    numberRedactionPattern,
    redactedEmailPlaceholder,
    redactedLinkPlaceholder,
    redactedNumberPlaceholder,
    supportTicketExcerptMaxLength
} from '../constants/support/supportTickets'

const maskedLocalSuffix = '***'

// first character of the local part and the full domain: enough to tell
// senders apart without exposing the address
export const maskEmail = (email: string): string => {
    const atIndex = email.lastIndexOf('@')

    if (atIndex < 1)
        return maskedLocalSuffix

    return `${email[0]}${maskedLocalSuffix}${email.slice(atIndex)}`
}

export const redactPersonalDetails = (message: string): string =>
    message
        .replace(linkRedactionPattern, redactedLinkPlaceholder)
        .replace(emailRedactionPattern, redactedEmailPlaceholder)
        .replace(numberRedactionPattern, redactedNumberPlaceholder)

// keeps what the reader needs to place a link (domain and first path segment) and drops the rest,
// which can hold tokens or ids; punctuation that ended the sentence is put back
const shortenLink = (link: string): string => {
    const trailing = link.match(linkTrailingPunctuationPattern)?.[0] ?? ''
    const body = link.slice(0, link.length - trailing.length)
    const [, host, firstSegment] = body.match(linkShortenPattern) ?? []

    if (!host)
        return redactedLinkPlaceholder

    return `${host}${firstSegment ? `/${firstSegment}` : ''}${trailing}`
}

// links are shortened first so an email or number inside the dropped query never needs matching
const redactTicketMessage = (message: string): string =>
    message
        .replace(linkRedactionPattern, shortenLink)
        .replace(emailRedactionPattern, redactedEmailPlaceholder)
        .replace(numberRedactionPattern, redactedNumberPlaceholder)

// redact the full message before slicing, so a pattern cut by the limit is never partly leaked
export const toTicketExcerpt = (message: string): string => {
    const redacted = redactPersonalDetails(message)

    return redacted.length > supportTicketExcerptMaxLength
        ? `${redacted.slice(0, supportTicketExcerptMaxLength).trimEnd()}...`
        : redacted
}

// Allow-list on purpose: no user id, no full message, no full sender email.
// The excerpt is redacted (emails, phones, long numbers, links); names and addresses are not caught (best effort)
export const toReaderTicket = ({
    id,
    topic,
    createdAt,
    status,
    message,
    senderEmail
}: SupportTicket) => ({
    id,
    topic,
    createdAt,
    status,
    excerpt: toTicketExcerpt(message),
    senderEmail: maskEmail(senderEmail)
})

// Allow-list on purpose: no replies, no user id, no full sender email.
// The full message is redacted (emails, phones, long numbers) and links are cut to domain and first path segment
export const toReaderTicketDetail = ({
    id,
    topic,
    createdAt,
    status,
    message,
    senderEmail
}: SupportTicket) => ({
    id,
    topic,
    createdAt,
    status,
    message: redactTicketMessage(message),
    senderEmail: maskEmail(senderEmail)
})
