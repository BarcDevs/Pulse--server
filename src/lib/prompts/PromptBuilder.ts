import {
    FINAL_TEXT_ONLY_RULE,
    injectBrandName,
    languageInstruction
} from './sharedInstructions'

// Every prompt is a role, the language rules, a body, then the output rules.
// build() assembles them in that order, so a subclass cannot leave out the
// language or output rules by forgetting to call them.
export abstract class PromptBuilder<TInput> {
    protected abstract role(input: TInput): string

    protected abstract body(input: TInput, language?: string | null): string

    // Plain-text prompts end with the final-text rule; JSON prompts override
    // this because their body already defines the exact output shape.
    protected outputRules(): string {
        return `${FINAL_TEXT_ONLY_RULE}\n\nOutput only the final message text.`
    }

    build(input: TInput, language?: string | null): string {
        return injectBrandName(
            `${this.role(input)}\n${languageInstruction(language)}\n\n${this.body(input, language)}\n${this.outputRules()}`
        ).trim()
    }
}
