import joi from 'joi'

import type { NewReplyType } from '../../types/data/ReplyType'

export const newReplySchema = joi.object<Omit<NewReplyType, 'authorId'>>({
    body: joi.string().required()
})
