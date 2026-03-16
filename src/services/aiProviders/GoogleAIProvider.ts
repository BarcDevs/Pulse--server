import {
    aiConfig,
    aiGenerationConfig
} from '../../../config'
import logger from '../../utils/logger'

import {
    AIProvider,
    type GenerateContentInput,
    type GenerateContentOutput
} from './AIProvider'

class GoogleAIProvider extends AIProvider {
    private readonly modelId = aiConfig.googleModel

    validateConfiguration(): void {
        if (!this.apiKey) {
            throw new Error(
                'GOOGLE_AI_API_KEY is not configured'
            )
        }
    }

    async generateContent(
        input: GenerateContentInput
    ): Promise<GenerateContentOutput> {
        this.validateConfiguration()

        const baseUrl = 'https://generativelanguage.googleapis.com'
        const url = `${baseUrl}/v1beta/models/${this.modelId}:generateContent`
        const urlWithKey = `${url}?key=${this.apiKey}`

        const response = await fetch(urlWithKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {text: input.prompt}
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens:
                    aiGenerationConfig.maxOutputTokens,
                    temperature:
                    aiGenerationConfig.temperature
                }
            })
        })

        if (!response.ok) {
            let errorMsg = 'Unknown error'
            try {
                const errorData = await response.json()
                errorMsg = errorData.error?.message || 'API error'
            } catch {
                // Ignore JSON parse errors
            }
            logger.error('Google AI API request failed', {
                status: response.status,
                error: errorMsg
            })
            throw new Error(
                `Failed to generate content from Google AI: ${response.status}`
            )
        }

        const data = await response.json()

        if (data.candidates?.[0]?.finishReason !== 'STOP') {
            logger.warn('Google AI: incomplete response', {
                finishReason: data.candidates?.[0]?.finishReason,
                tokenUsage: data.usageMetadata?.totalTokenCount
            })
        }

        if (
            !data.candidates
            || !data.candidates[0]
            || !data.candidates[0].content
            || !data.candidates[0].content.parts
            || !data.candidates[0].content.parts[0]
        ) {
            throw new Error(
                'Unexpected response format from Google AI API'
            )
        }

        const parts = data.candidates[0].content.parts
        const content = parts
            .map((part: {text?: string}) => part.text || '')
            .join('')

        if (!content || content.trim().length === 0) {
            throw new Error(
                'Failed to generate insight content from Google AI'
            )
        }

        return {content}
    }
}

export {GoogleAIProvider}
