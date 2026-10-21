import { z } from 'zod'

import { SupportTicketStatus } from '../../../prisma/generated/prisma/enums'
import {
    cursorField,
    paginationFields
} from '../utils/fields'

export const supportTicketQuerySchema = z.object({
    limit: paginationFields.limit,
    cursor: cursorField,
    status: z.enum(SupportTicketStatus).optional()
})

export type SupportTicketQueryType
    = z.infer<typeof supportTicketQuerySchema>
