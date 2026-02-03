import { z } from 'zod'
import { DEFAULT_LLM_MODEL, MODEL_PRICING } from '../../shared/llmCatalog'

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

const GatewayResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional(),
      })
    )
    .optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
})

export function parseGatewayResponse(data: unknown): CompletionResult {
  const parsed = GatewayResponseSchema.safeParse(data)
  if (!parsed.success) {
    return {
      content: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }

  const value = parsed.data
  return {
    content: value.choices?.[0]?.message?.content ?? '',
    usage: {
      prompt_tokens: value.usage?.prompt_tokens ?? 0,
      completion_tokens: value.usage?.completion_tokens ?? 0,
      total_tokens: value.usage?.total_tokens ?? 0,
    },
  }
}

export async function completeWithGateway(params: CompletionParams): Promise<CompletionResult> {
  const config = getGatewayConfig()
  if (!config.key) {
    throw new Error('AI_GATEWAY_API_KEY environment variable must be set')
  }

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

  return parseGatewayResponse(await response.json())
}

export function calculateCost(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): number {
  const pricing =
    MODEL_PRICING[model as keyof typeof MODEL_PRICING] ?? MODEL_PRICING[DEFAULT_LLM_MODEL]
  const inputCost = (usage.prompt_tokens / 1000) * pricing.input
  const outputCost = (usage.completion_tokens / 1000) * pricing.output
  return Number((inputCost + outputCost).toFixed(6))
}
