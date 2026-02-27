import joi from 'joi'

import type {UpdateReplyType} from '../../types/data/ReplyType'

export const updateReplySchema = joi.object<UpdateReplyType>({
    body: joi.string(),
    vote: joi.object({
        userId: joi.string().required(),
        vote: joi.valid('up', 'down').required()
    })
})
