import {
    aiConfig,
    aiGenerationConfig
} from '../../../config'
import logger from '../../utils/logger'

import {
    type AIErrorResponse,
    AIProvider,
    type GenerateContentInput,
    type GenerateContentOutput
} from './AIProvider'

export class AnthropicProvider extends AIProvider {
    private readonly modelId = aiConfig.anthropicModel
    private readonly apiVersion = '2023-06-01'

    validateConfiguration(): void {
        if (!this.apiKey) {
            throw new Error(
                'ANTHROPIC_API_KEY is not configured'
            )
        }
    }

    async generateContent(
        input: GenerateContentInput
    ): Promise<GenerateContentOutput> {
        this.validateConfiguration()

        const response = await fetch(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': this.apiVersion
                },
                body: JSON.stringify({
                    model: this.modelId,
                    max_tokens: aiGenerationConfig
                        .maxOutputTokens,
                    messages: [
                        {
                            role: 'user',
                            content: input.prompt
                        }
                    ]
                }),
                signal: AbortSignal.timeout(
                    aiGenerationConfig.timeoutMs
                )
            }
        )

        if (!response.ok) {
            let errorMsg = 'Unknown error'
            try {
                const errorData = await response.json() as AIErrorResponse
                errorMsg = errorData.error?.message || 'API error'
            } catch {
                // Ignore JSON parse errors
            }
            logger.error(
                `Anthropic API request failed: ${response.status} - ${errorMsg}`
            )
            throw new Error(
                `Failed to generate content from Anthropic: ${response.status}`
            )
        }

        const data = await response.json() as {
            content?: Array<{ type?: string, text?: string }>
            stop_reason?: string
            usage?: { output_tokens?: number }
        }

        if (data.stop_reason === 'max_tokens') {
            logger.warn(
                `Anthropic: response cut off - stop_reason=max_tokens, output_tokens=${data.usage?.output_tokens}, max_tokens=${aiGenerationConfig.maxOutputTokens}`
            )
            throw new Error(
                'Anthropic response was cut off at the token limit'
            )
        }

        const textBlock = data.content?.find(block => block.type === 'text' && block.text)

        if (!textBlock || !textBlock.text) {
            throw new Error(
                'Unexpected response format from Anthropic API'
            )
        }

        const content = textBlock.text

        if (!content || content.trim().length === 0) {
            throw new Error(
                'Failed to generate insight content from Anthropic'
            )
        }

        return { content }
    }
}