import { emailConfig } from '../../config'
import { SupportTicketStatus } from '../../prisma/generated/prisma/enums'
import { ErrorCodes } from '../constants/errorCodes'
import {
    supportReplyEmailSubjectPrefix,
    supportTicketListDefaultLimit
} from '../constants/support/supportTickets'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { ValidationError } from '../errors/ValidationError'
import { toReaderTicket } from '../lib/supportTicketReader'
import {
    addReplyAndMarkAnswered,
    createTicket,
    getTicketById,
    getTicketForReply,
    listTickets,
    ticketIdExists
} from '../models/supportTicketModel'
import type { SupportContactType } from '../schemas/support/supportContactSchema'
import type { SupportTicketQueryType } from '../schemas/support/supportTicketQuerySchema'
import { sendEmail } from '../utils/emailSender'
import logger from '../utils/logger'

import { getUser } from './authService'

type SendSupportMessageParams = SupportContactType & {
    userId?: string
}

type RecordTicketReplyParams = {
    ticketId: string
    adminId: string
    body: string
}

// The ticket is stored before the email, so a failed email keeps the
// message. Logs carry the ticket id only: never the email or the message
export const sendSupportMessage = async ({
    topic,
    message,
    email,
    userId
}: SendSupportMessageParams): Promise<void> => {
    const user = userId
        ? await getUser('id', userId)
        : null
    const senderEmail = user?.email ?? email

    if (!senderEmail)
        throw new ValidationError('Email is required', ErrorCodes.VALIDATION_GENERIC, 'email')

    const ticket = await createTicket({
        topic,
        message,
        senderEmail,
        userId: user?.id
    })

    const text = [
        `Ticket: ${ticket.id}`,
        `Topic: ${topic}`,
        `From: ${senderEmail}`,
        `Signed in: ${user ? `yes (user id: ${user.id})` : 'no'}`,
        '',
        message
    ].join('\n')

    try {
        await sendEmail(
            emailConfig.supportEmail,
            `[Pulse support] ${topic}`,
            text,
            undefined,
            senderEmail
        )
    } catch (error) {
        logger.error(`Support email failed, ticket ${ticket.id} kept`)
        throw error
    }
}

// No route yet: the future admin app calls this. Emails the sender first, so
// a failed email leaves the ticket unchanged and the reply unrecorded
export const recordTicketReply = async ({
    ticketId,
    adminId,
    body
}: RecordTicketReplyParams): Promise<void> => {
    const ticket = await getTicketForReply(ticketId)

    if (!ticket)
        throw errorFactory.generic.notFound('Ticket')

    if (ticket.status === SupportTicketStatus.CLOSED)
        throw errorFactory.generic.conflict('Ticket is closed')

    await sendEmail(
        ticket.senderEmail,
        `${supportReplyEmailSubjectPrefix} ${ticket.topic}`,
        body,
        undefined,
        emailConfig.supportEmail
    )

    await addReplyAndMarkAnswered({
        ticketId,
        body,
        sentByUserId: adminId
    })
}

const toCursorPage = <T extends { id: string },>(
    rows: T[],
    limit: number
) => {
    const items = rows.slice(0, limit)

    return {
        items,
        nextCursor: rows.length > limit
            ? items.at(-1)?.id ?? null
            : null
    }
}

export const listSupportTickets = async ({
    status,
    limit = supportTicketListDefaultLimit,
    cursor
}: SupportTicketQueryType) => {
    const rows = await listTickets({
        status,
        limit,
        cursor
    })

    if (
        cursor
        && rows.length === 0
        && !await ticketIdExists(cursor)
    )
        throw errorFactory.generic.notFound('Cursor')

    return toCursorPage(rows, limit)
}

export const listSupportTicketsForReader = async (
    query: SupportTicketQueryType
) => {
    const { items, nextCursor } = await listSupportTickets(query)

    return {
        items: items.map(toReaderTicket),
        nextCursor
    }
}

export const getSupportTicket = async (id: string) => {
    const ticket = await getTicketById(id)

    if (!ticket)
        throw errorFactory.generic.notFound('Ticket')

    return ticket
}
