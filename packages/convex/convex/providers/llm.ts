const VERCEL_AI_GATEWAY_URL = process.env.VERCEL_AI_GATEWAY_URL
const VERCEL_AI_GATEWAY_TOKEN = process.env.VERCEL_AI_GATEWAY_TOKEN

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
  if (!VERCEL_AI_GATEWAY_URL || !VERCEL_AI_GATEWAY_TOKEN) {
    throw new Error('VERCEL_AI_GATEWAY_URL and VERCEL_AI_GATEWAY_TOKEN must be set')
  }

  const response = await fetch(`${VERCEL_AI_GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VERCEL_AI_GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1024,
      response_format: params.response_format,
    }),
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
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
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
