import { capitalizeText } from '../../utils/capitalizeText'

describe('capitalizeText utility', () => {
    it(
        'should return empty string for empty input',
        () => {
            const result = capitalizeText('')

            expect(result).toBe('')
        }
    )

    it(
        'should return empty string for null-like input',
        () => {
            const result = capitalizeText(
                null as unknown as string
            )

            expect(result).toBe('')
        }
    )

    it(
        'should return empty string for undefined input',
        () => {
            const result = capitalizeText(
                undefined as unknown as string
            )

            expect(result).toBe('')
        }
    )

    it(
        'should capitalize single lowercase letter',
        () => {
            const result = capitalizeText('a')

            expect(result).toBe('A')
        }
    )

    it(
        'should keep single uppercase letter unchanged',
        () => {
            const result = capitalizeText('A')

            expect(result).toBe('A')
        }
    )

    it(
        'should capitalize first letter of lowercase word',
        () => {
            const result = capitalizeText('hello')

            expect(result).toBe('Hello')
        }
    )

    it(
        'should keep already capitalized word unchanged',
        () => {
            const result = capitalizeText('Hello')

            expect(result).toBe('Hello')
        }
    )

    it(
        'should only capitalize first letter of all uppercase word',
        () => {
            const result = capitalizeText('HELLO')

            expect(result).toBe('HELLO')
        }
    )

    it(
        'should capitalize first letter of mixed case word',
        () => {
            const result = capitalizeText('hELLO')

            expect(result).toBe('HELLO')
        }
    )

    it('should handle words with numbers', () => {
        const result = capitalizeText('test123')

        expect(result).toBe('Test123')
    })

    it(
        'should handle strings starting with numbers',
        () => {
            const result = capitalizeText('123test')

            expect(result).toBe('123test')
        }
    )

    it(
        'should handle strings with special characters',
        () => {
            const result = capitalizeText('@hello')

            expect(result).toBe('@hello')
        }
    )

    it('should handle strings with spaces', () => {
        const result = capitalizeText('hello world')

        expect(result).toBe('Hello world')
    })

    it('should handle single space', () => {
        const result = capitalizeText(' ')

        expect(result).toBe(' ')
    })

    it(
        'should handle strings starting with space',
        () => {
            const result = capitalizeText(' hello')

            expect(result).toBe(' hello')
        }
    )
})
