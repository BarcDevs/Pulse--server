import type { SupportTicket } from '../../prisma/generated/prisma/client'
import { supportTicketExcerptMaxLength } from '../constants/support/supportTickets'

const maskedLocalSuffix = '***'

// first character of the local part and the full domain: enough to tell
// senders apart without exposing the address
export const maskEmail = (email: string): string => {
    const atIndex = email.lastIndexOf('@')

    if (atIndex < 1)
        return maskedLocalSuffix

    return `${email[0]}${maskedLocalSuffix}${email.slice(atIndex)}`
}

export const toTicketExcerpt = (message: string): string =>
    message.length > supportTicketExcerptMaxLength
        ? `${message.slice(0, supportTicketExcerptMaxLength).trimEnd()}...`
        : message

// Allow-list on purpose: no user id, no full message, no full email
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
