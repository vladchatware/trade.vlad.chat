export const LLM_MODELS = [
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', input: 0.0005, output: 0.002 },
  {
    id: 'xai/grok-4.1-fast-reasoning',
    label: 'Grok 4.1 Fast Reasoning',
    input: 0.001,
    output: 0.004,
  },
  {
    id: 'deepseek/deepseek-v3.2-thinking',
    label: 'DeepSeek V3.2 Thinking',
    input: 0.0003,
    output: 0.001,
  },
] as const

export type LlmModelId = (typeof LLM_MODELS)[number]['id']

export const DEFAULT_LLM_MODEL: LlmModelId = 'moonshotai/kimi-k2.5'
export const DEFAULT_LLM_ANALYST_MODEL: LlmModelId = 'moonshotai/kimi-k2.5'

export const MODEL_PRICING: Record<LlmModelId, { input: number; output: number }> =
  Object.fromEntries(
    LLM_MODELS.map((model) => [model.id, { input: model.input, output: model.output }])
  ) as Record<LlmModelId, { input: number; output: number }>

export function isSupportedLlmModel(model: string): model is LlmModelId {
  return LLM_MODELS.some((item) => item.id === model)
}
