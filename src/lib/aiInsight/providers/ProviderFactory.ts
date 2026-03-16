import {aiConfig} from '../../../../config'

import {type AIProvider} from './AIProvider'
import {AnthropicProvider} from './AnthropicProvider'
import {GoogleAIProvider} from './GoogleAIProvider'
import {OpenAIProvider} from './OpenAIProvider'

type ProviderType = 'google' | 'openai' | 'anthropic'

const createProvider = (): AIProvider => {
    const providerType: ProviderType = (
        aiConfig.provider as ProviderType
    ) || 'google'

    const apiKey = getApiKeyForProvider(providerType)

    switch (providerType) {
        case 'openai':
            return new OpenAIProvider({apiKey})
        case 'anthropic':
            return new AnthropicProvider({apiKey})
        case 'google':
        default:
            return new GoogleAIProvider({apiKey})
    }
}

const getApiKeyForProvider = (
    providerType: ProviderType
): string => {
    switch (providerType) {
        case 'openai':
            return aiConfig.openaiApiKey || ''
        case 'anthropic':
            return aiConfig.anthropicApiKey || ''
        case 'google':
        default:
            return aiConfig.googleApiKey || ''
    }
}

export {createProvider}
export type {ProviderType}