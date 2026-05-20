import { z } from 'zod'

export const unknownTagSchema = z.object({
    tagName: z.string().min(1).max(100)
})
