import type { GeneratedTextKind } from '../../constants/aiInsight/textLimits'

import {
    FINAL_TEXT_ONLY_RULE,
    injectBrandName,
    languageInstruction,
    lengthRule
} from './sharedInstructions'

// Every prompt is a role, the language rules, a body, then the output rules.
// build() assembles them in that order, so a subclass cannot leave out the
// language or output rules by forgetting to call them.
export abstract class PromptBuilder<TInput> {
    protected abstract role(input: TInput): string

    protected abstract body(input: TInput, language?: string | null): string

    // The kind of text this prompt produces; its length limits come from TEXT_LIMITS.
    // Prompts whose reply is not a single text (the feedback JSON) have none.
    protected kind(): GeneratedTextKind | undefined {
        return undefined
    }

    // A prompt whose reply is JSON states the limit for its text field in the body instead
    protected lengthRule(language?: string | null): string {
        const kind = this.kind()
        return kind ? `\n${lengthRule(kind, language)}` : ''
    }

    // Plain-text prompts end with the final-text rule; JSON prompts override
    // this because their body already defines the exact output shape.
    protected outputRules(): string {
        return `${FINAL_TEXT_ONLY_RULE}\n\nOutput only the final message text.`
    }

    build(input: TInput, language?: string | null): string {
        return injectBrandName(
            `${this.role(input)}\n${languageInstruction(language)}\n\n${this.body(input, language)}${this.lengthRule(language)}\n${this.outputRules()}`
        ).trim()
    }
}
