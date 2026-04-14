export type AIProviderConfig = {
    apiKey: string
}

export type GenerateContentInput = {
    prompt: string
}

export type GenerateContentOutput = {
    content: string
}

export abstract class AIProvider {
    protected apiKey: string

    constructor(config: AIProviderConfig) {
        this.apiKey = config.apiKey
    }

    abstract generateContent(
        input: GenerateContentInput
    ): Promise<GenerateContentOutput>

    abstract validateConfiguration(): void
}