import { z } from 'zod'

import { tagNameField } from '../utils/fields'

export const unknownTagSchema = z.object({
    tagName: tagNameField
})
