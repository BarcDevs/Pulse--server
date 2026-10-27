import type { SupportTicket } from '../../prisma/generated/prisma/client'
import {
    emailRedactionPattern,
    linkRedactionPattern,
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
