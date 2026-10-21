import {
    SupportTicketStatus
} from '../../prisma/generated/prisma/enums'
import Prisma from '../utils/prismaClient'

type TicketListParams = {
    status?: SupportTicketStatus
    limit: number
    cursor?: string
}

type NewTicketParams = {
    topic: string
    message: string
    senderEmail: string
    userId?: string
}

type NewReplyParams = {
    ticketId: string
    body: string
    sentByUserId: string
}

export const createTicket = ({
    topic,
    message,
    senderEmail,
    userId
}: NewTicketParams) =>
    Prisma.supportTicket.create({
        data: {
            topic,
            message,
            senderEmail,
            userId
        }
    })

// Takes one extra row so the caller can tell whether another page exists
export const listTickets = ({
    status,
    limit,
    cursor
}: TicketListParams) =>
    Prisma.supportTicket.findMany({
        where: { status },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }
        ],
        take: limit + 1,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1
        })
    })

export const ticketIdExists = async (
    id: string
): Promise<boolean> =>
    await Prisma.supportTicket.count({ where: { id } }) > 0

export const getTicketById = (id: string) =>
    Prisma.supportTicket.findUnique({
        where: { id },
        include: {
            replies: {
                orderBy: { sentAt: 'asc' }
            }
        }
    })

export const getTicketForReply = (id: string) =>
    Prisma.supportTicket.findUnique({
        where: { id },
        select: {
            topic: true,
            senderEmail: true,
            status: true
        }
    })

export const addReplyAndMarkAnswered = ({
    ticketId,
    body,
    sentByUserId
}: NewReplyParams) =>
    Prisma.$transaction(async (tx) => {
        await tx.supportTicketReply.create({
            data: {
                ticketId,
                body,
                sentByUserId
            }
        })

        return tx.supportTicket.update({
            where: { id: ticketId },
            data: { status: SupportTicketStatus.ANSWERED }
        })
    })

// A ticket never closed has closedAt null. Deleting the row removes the
// sender email and user link with it, so no separate blanking pass is needed
export const deleteTicketsExpiredBefore = (
    closedCutoff: Date,
    openCutoff: Date
) =>
    Prisma.supportTicket.deleteMany({
        where: {
            OR: [
                {
                    status: SupportTicketStatus.CLOSED,
                    closedAt: { lte: closedCutoff }
                },
                {
                    closedAt: null,
                    createdAt: { lte: openCutoff }
                }
            ]
        }
    })
