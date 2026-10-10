import { aiConfig } from '../../config'

export type Vendor = 'openai' | 'google' | 'anthropic'

export type CallResult = {
    text: string
    finish: string
    completed: boolean
    inputTokens: number
    outputTokens: number
    reasoningTokens: number
    blocks: string[]
    ms: number
    error?: string
}

type RawCall = Omit<CallResult, 'ms'>

// Mirrors production: src/services/aiProviders/* and config aiGeneration.
const MAX_OUTPUT_TOKENS = 1000
const GOOGLE_TEMPERATURE = 0.7
const CALL_TIMEOUT_MS = 90000
const RETRY_DELAY_MS = 6000
const MAX_ATTEMPTS = 3

const emptyFailure = (error: string): RawCall => ({
    text: '',
    finish: 'error',
    completed: false,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    blocks: [],
    error
})

type ApiError = { error?: { message: string } }

type AnthropicBlock = { type: string, text?: string }

type AnthropicResponse = ApiError & {
    content?: AnthropicBlock[]
    stop_reason: string
    usage?: { input_tokens?: number, output_tokens?: number }
}

type OpenAIResponse = ApiError & {
    choices?: { message?: { content?: string }, finish_reason?: string }[]
    usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        completion_tokens_details?: { reasoning_tokens?: number }
    }
}

type GooglePart = { thought?: boolean, text?: string }

type GoogleResponse = ApiError & {
    candidates?: { content?: { parts?: GooglePart[] }, finishReason?: string }[]
    usageMetadata?: {
        thoughtsTokenCount?: number
        promptTokenCount?: number
        candidatesTokenCount?: number
    }
}

const post = async <T,>(
    url: string,
    headers: Record<string, string>,
    body: unknown
): Promise<{ status: number, json: T }> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
    })
    const json = await response.json().catch(() => ({})) as T
    return { status: response.status, json }
}

const callAnthropic = async (
    model: string,
    prompt: string,
    maxTokens: number
): Promise<RawCall> => {
    const { status, json } = await post<AnthropicResponse>(
        'https://api.anthropic.com/v1/messages',
        {
            'x-api-key': aiConfig.anthropicApiKey,
            'anthropic-version': '2023-06-01'
        },
        {
            model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        }
    )
    if (json.error) return { ...emptyFailure(`${status} ${json.error.message}`), finish: `http-${status}` }
    const blocks: AnthropicBlock[] = json.content ?? []
    return {
        text: blocks.filter(b => b.type === 'text').map(b => b.text).join(''),
        finish: json.stop_reason,
        completed: json.stop_reason === 'end_turn',
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        reasoningTokens: 0,
        blocks: blocks.map(b => b.type)
    }
}

const callOpenAI = async (
    model: string,
    prompt: string,
    maxTokens: number
): Promise<RawCall> => {
    const { status, json } = await post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        { Authorization: `Bearer ${aiConfig.openaiApiKey}` },
        {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_completion_tokens: maxTokens
        }
    )
    if (json.error) return { ...emptyFailure(`${status} ${json.error.message}`), finish: `http-${status}` }
    const choice = json.choices?.[0]
    return {
        text: choice?.message?.content ?? '',
        finish: choice?.finish_reason ?? 'unknown',
        completed: choice?.finish_reason === 'stop',
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        blocks: ['text']
    }
}

const callGoogle = async (
    model: string,
    prompt: string,
    maxTokens: number
): Promise<RawCall> => {
    const { status, json } = await post<GoogleResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { 'x-goog-api-key': aiConfig.googleApiKey },
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: GOOGLE_TEMPERATURE
            }
        }
    )
    if (json.error) return { ...emptyFailure(`${status} ${json.error.message}`), finish: `http-${status}` }
    const candidate = json.candidates?.[0]
    const parts: GooglePart[] = candidate?.content?.parts ?? []
    const thoughts = json.usageMetadata?.thoughtsTokenCount ?? 0
    return {
        text: parts.filter(p => !p.thought).map(p => p.text ?? '').join(''),
        finish: candidate?.finishReason ?? 'unknown',
        completed: candidate?.finishReason === 'STOP',
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: (json.usageMetadata?.candidatesTokenCount ?? 0) + thoughts,
        reasoningTokens: thoughts,
        blocks: ['text']
    }
}

const callers: Record<Vendor, (model: string, prompt: string, maxTokens: number) => Promise<RawCall>> = {
    anthropic: callAnthropic,
    openai: callOpenAI,
    google: callGoogle
}

const isRetryable = (result: RawCall): boolean =>
    result.error !== undefined
    && (/^http-(429|5\d\d)$/.test(result.finish) || result.finish === 'error')

const sleep = async (ms: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, ms))
}

// Latency is the wall time of the final attempt only (retry back-off excluded).
export const generate = async (
    vendor: Vendor,
    model: string,
    prompt: string,
    maxTokens: number = MAX_OUTPUT_TOKENS
): Promise<CallResult> => {
    let last: CallResult = { ...emptyFailure('not attempted'), ms: 0 }
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const started = Date.now()
        let raw: RawCall
        try {
            raw = await callers[vendor](model, prompt, maxTokens)
        } catch (error) {
            raw = emptyFailure(error instanceof Error ? error.message : 'unknown error')
        }
        last = { ...raw, ms: Date.now() - started }
        if (!isRetryable(raw) || attempt === MAX_ATTEMPTS) break
        await sleep(RETRY_DELAY_MS * attempt)
    }
    return last
}
