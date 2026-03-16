type AIProviderConfig = {
    apiKey: string
}

type GenerateContentInput = {
    prompt: string
}

type GenerateContentOutput = {
    content: string
}

abstract class AIProvider {
    protected apiKey: string

    constructor(config: AIProviderConfig) {
        this.apiKey = config.apiKey
    }

    abstract generateContent(
        input: GenerateContentInput
    ): Promise<GenerateContentOutput>

    abstract validateConfiguration(): void
}

export {AIProvider}
export type {
    AIProviderConfig,
    GenerateContentInput,
    GenerateContentOutput
}