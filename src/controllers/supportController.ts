import type { Request, Response } from 'express'

import { successResponse } from '../responses/success'
import type { SupportContactType } from '../schemas/support/supportContactSchema'
import { supportContactSchema } from '../schemas/support/supportContactSchema'
import { sendSupportMessage } from '../services/supportService'
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
