import {
    aiConfig,
    aiGenerationConfig
} from '../../../../config'
import logger from '../../../utils/logger'

import {
    AIProvider,
    type GenerateContentInput,
    type GenerateContentOutput
} from './AIProvider'

class AnthropicProvider extends AIProvider {
    private readonly modelId = aiConfig.anthropicModel
    private readonly apiVersion = '2024-06-01'

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
                })
            }
        )

        if (!response.ok) {
            let errorMsg = 'Unknown error'
            try {
                const errorData = await response.json()
                errorMsg = errorData.error?.message || 'API error'
            } catch {
                // Ignore JSON parse errors
            }
            logger.error('Anthropic API request failed', {
                status: response.status,
                error: errorMsg
            })
            throw new Error(
                `Failed to generate content from Anthropic: ${response.status}`
            )
        }

        const data = await response.json()

        if (
            !data.content
            || !Array.isArray(data.content)
            || !data.content[0]
            || !data.content[0].text
        ) {
            throw new Error(
                'Unexpected response format from Anthropic API'
            )
        }

        const content = data.content[0].text

        if (!content || content.trim().length === 0) {
            throw new Error(
                'Failed to generate insight content from Anthropic'
            )
        }

        return {content}
    }
}

export {AnthropicProvider}