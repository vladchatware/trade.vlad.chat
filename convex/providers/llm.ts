// AI Gateway Configuration
// These are read from environment variables set in Convex dashboard or .env.local
const getGatewayConfig = () => ({
  url: process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1',
  key: process.env.AI_GATEWAY_API_KEY,
})

export interface CompletionParams {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' } | { type: 'text' }
}

export interface CompletionResult {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function completeWithGateway(params: CompletionParams): Promise<CompletionResult> {
  const config = getGatewayConfig()

  if (!config.key) {
    throw new Error('AI_GATEWAY_API_KEY environment variable must be set')
  }

  // Build request body, only include response_format if provided
  const requestBody: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 1024,
  }

  if (params.response_format) {
    requestBody.response_format = params.response_format
  }

  const response = await fetch(`${config.url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`AI Gateway error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0]?.message?.content ?? '',
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? 0,
    },
  }
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI models
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'openai/gpt-5.2-codex': { input: 0.003, output: 0.012 },

  // Anthropic models
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },

  // AI Gateway models
  'moonshotai/kimi-k2.5': { input: 0.0005, output: 0.002 },
  'xai/grok-4.1-fast-reasoning': { input: 0.001, output: 0.004 },
  'deepseek/deepseek-v3.2-thinking': { input: 0.0003, output: 0.001 },
}

export function calculateCost(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4o-mini']
  const inputCost = (usage.prompt_tokens / 1000) * pricing.input
  const outputCost = (usage.completion_tokens / 1000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}
