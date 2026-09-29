import { z } from 'zod'

import {
    supportMessageMaxLength,
    supportTopics
} from '../../constants/support/supportTopics'

export const supportContactSchema = z.object({
    topic: z.enum(supportTopics, 'Topic is invalid'),
    message: z.string('Message is required')
        .trim()
        .min(1, 'Message is required')
        .max(
            supportMessageMaxLength,
            `Message must be at most ${supportMessageMaxLength} characters`
        ),
    email: z.email('Email is invalid').optional()
})

export type SupportContactType
    = z.infer<typeof supportContactSchema>
