import type { Request, Response } from 'express'

import { successResponse } from '../responses/success'
import type { SupportContactType } from '../schemas/support/supportContactSchema'
import { supportContactSchema } from '../schemas/support/supportContactSchema'
import type { SupportTicketQueryType } from '../schemas/support/supportTicketQuerySchema'
import { supportTicketQuerySchema } from '../schemas/support/supportTicketQuerySchema'
import {
    getSupportTicket,
    getSupportTicketForReader,
    listSupportTickets,
    listSupportTicketsForReader,
    sendSupportMessage
} from '../services/supportService'
import { validateAndExtract } from '../utils/controllerHelpers'

export const contactSupport = async (
    req: Request,
    res: Response
) => {
    const validatedData = validateAndExtract<SupportContactType>(
        supportContactSchema,
        req.body
    )

    await sendSupportMessage({
        ...validatedData,
        userId: req.userId
    })

    successResponse(
        res,
        {},
        'Support message sent'
    )
}

export const getSupportTickets = async (
    req: Request,
    res: Response
) => {
    const query = validateAndExtract<SupportTicketQueryType>(
        supportTicketQuerySchema,
        req.query
    )

    successResponse(
        res,
        await listSupportTickets(query),
        'Support tickets fetched'
    )
}

export const getSupportTicketById = async (
    req: Request,
    res: Response
) => {
    const ticket = await getSupportTicket(
        String(req.params.ticketId)
    )

    successResponse(
        res,
        ticket,
        'Support ticket fetched'
    )
}

export const getTicketsForReader = async (
    req: Request,
    res: Response
) => {
    const query = validateAndExtract<SupportTicketQueryType>(
        supportTicketQuerySchema,
        req.query
    )

    successResponse(
        res,
        await listSupportTicketsForReader(query),
        'Support tickets fetched'
    )
}

export const getTicketForReader = async (
    req: Request,
    res: Response
) => {
    const ticket = await getSupportTicketForReader(
        String(req.params.ticketId)
    )

    successResponse(
        res,
        ticket,
        'Support ticket fetched'
    )
}
