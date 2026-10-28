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

// Only the reader takes since: it fetches what arrived after its last run
export const supportReaderTicketQuerySchema =
    supportTicketQuerySchema.extend({
        since: z.iso
            .datetime({ offset: true })
            .pipe(z.coerce.date())
            .optional()
    })

export type SupportTicketQueryType
    = z.infer<typeof supportTicketQuerySchema>

export type SupportReaderTicketQueryType
    = z.infer<typeof supportReaderTicketQuerySchema>
