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

export class OpenAIProvider extends AIProvider {
    private readonly modelId = aiConfig.openaiModel

    validateConfiguration(): void {
        if (!this.apiKey) {
            throw new Error(
                'OPENAI_API_KEY is not configured'
            )
        }
    }

    async generateContent(
        input: GenerateContentInput
    ): Promise<GenerateContentOutput> {
        this.validateConfiguration()

        const response = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.modelId,
                    messages: [
                        {
                            role: 'user',
                            content: input.prompt
                        }
                    ],
                    max_tokens:
                        aiGenerationConfig.maxOutputTokens,
                    temperature:
                        aiGenerationConfig.temperature
                })
            }
        )

        if (!response.ok) {
            let errorMsg = 'Unknown error'
            try {
                const errorData = await response.json() as AIErrorResponse
                errorMsg = errorData.error?.message || 'API error'
            } catch {
                // Intentionally suppress JSON parse errors
            }
            logger.error('OpenAI API request failed', {
                status: response.status,
                error: errorMsg
            })
            throw new Error(
                `Failed to generate content from OpenAI: ${response.status}`
            )
        }

        const data = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>
        }

        if (
            !data.choices
            || !data.choices[0]
            || !data.choices[0].message
            || !data.choices[0].message.content
        ) {
            throw new Error(
                'Unexpected response format from OpenAI API'
            )
        }

        const content = data.choices[0].message.content

        if (!content || content.trim().length === 0) {
            throw new Error(
                'Failed to generate insight content from OpenAI'
            )
        }

        return { content }
    }
}