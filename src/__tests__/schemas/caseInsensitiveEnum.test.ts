import { z } from 'zod'

import { caseInsensitiveEnum } from '../../schemas/utils/caseInsensitiveEnum'

describe('caseInsensitiveEnum', () => {
    const schema = z.object({
        category: caseInsensitiveEnum(['physical', 'mental', 'lifestyle'])
    })

    it('should accept exact match', () => {
        const result = schema.safeParse({ category: 'physical' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.category).toBe('physical')
        }
    })

    it('should accept uppercase', () => {
        const result = schema.safeParse({ category: 'MENTAL' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.category).toBe('mental')
        }
    })

    it('should accept mixed case', () => {
        const result = schema.safeParse({ category: 'LifeStyle' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.category).toBe('lifestyle')
        }
    })

    it('should reject invalid value', () => {
        const result = schema.safeParse({ category: 'invalid' })
        expect(result.success).toBe(false)
    })

    it('should reject non-string', () => {
        const result = schema.safeParse({ category: 123 })
        expect(result.success).toBe(false)
    })
})
