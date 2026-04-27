import { newGoalSchema } from '../../schemas/recoveryGoal/newGoalSchema'
import { updateGoalSchema } from '../../schemas/recoveryGoal/updateGoalSchema'

describe('Recovery Goal Schemas', () => {
    describe('newGoalSchema', () => {
        it('should accept valid goal with future targetDate', () => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7)

            const result = newGoalSchema.safeParse({
                title: 'Build strength',
                category: 'physical',
                targetDate: futureDate.toISOString()
            })

            expect(result.success).toBe(true)
        })

        it('should reject goal with past targetDate', () => {
            const pastDate = new Date()
            pastDate.setDate(pastDate.getDate() - 1)

            const result = newGoalSchema.safeParse({
                title: 'Build strength',
                category: 'physical',
                targetDate: pastDate.toISOString()
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    'Target date must be in the future'
                )
            }
        })

        it('should reject goal with current date as targetDate', () => {
            const now = new Date().toISOString()

            const result = newGoalSchema.safeParse({
                title: 'Build strength',
                category: 'physical',
                targetDate: now
            })

            expect(result.success).toBe(false)
        })

        it('should accept goal without targetDate', () => {
            const result = newGoalSchema.safeParse({
                title: 'Build strength',
                category: 'physical'
            })

            expect(result.success).toBe(true)
        })
    })

    describe('updateGoalSchema', () => {
        it('should accept update with future targetDate', () => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 14)

            const result = updateGoalSchema.safeParse({
                targetDate: futureDate.toISOString()
            })

            expect(result.success).toBe(true)
        })

        it('should reject update with past targetDate', () => {
            const pastDate = new Date()
            pastDate.setDate(pastDate.getDate() - 7)

            const result = updateGoalSchema.safeParse({
                targetDate: pastDate.toISOString()
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    'Target date must be in the future'
                )
            }
        })

        it('should accept update without targetDate', () => {
            const result = updateGoalSchema.safeParse({
                title: 'Updated title'
            })

            expect(result.success).toBe(true)
        })
    })
})
