import { PromptBuilder } from '../PromptBuilder'

class TestPromptBuilder extends PromptBuilder<{ name: string }> {
    protected role(): string {
        return 'You help {{brandName}} users.'
    }

    protected body({ name }: { name: string }): string {
        return `Context: ${name}`
    }
}

class JsonPromptBuilder extends TestPromptBuilder {
    protected outputRules(): string {
        return ''
    }
}

describe('PromptBuilder', () => {
    const input = { name: 'walking' }

    it('puts the role first, then the language rules, then the body', () => {
        const prompt = new TestPromptBuilder().build(input, 'he')

        expect(prompt.indexOf('You help')).toBeLessThan(
            prompt.indexOf('Respond entirely in he')
        )
        expect(prompt.indexOf('Respond entirely in he')).toBeLessThan(
            prompt.indexOf('Context: walking')
        )
    })

    it('adds the language and final-text rules without the subclass asking', () => {
        const prompt = new TestPromptBuilder().build(input, 'en')

        expect(prompt).toContain('Never use em dashes')
        expect(prompt).toContain('Output ONLY the final message text')
    })

    it('replaces the brand name placeholder', () => {
        const prompt = new TestPromptBuilder().build(input, 'en')

        expect(prompt).not.toContain('{{brandName}}')
    })

    it('lets a JSON prompt drop the plain-text output rule but keeps the language rules', () => {
        const prompt = new JsonPromptBuilder().build(input, 'en')

        expect(prompt).not.toContain('Output ONLY the final message text')
        expect(prompt).toContain('Never use em dashes')
    })
})
