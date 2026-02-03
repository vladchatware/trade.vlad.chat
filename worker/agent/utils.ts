import type { ToolResult } from './types'

export function parseToolResult(result: unknown) {
  const toolResult = result as ToolResult
  const firstText = toolResult.content?.find((item) => typeof item.text === 'string')?.text
  if (typeof firstText === 'string') {
    return JSON.parse(firstText)
  }

  if (toolResult.toolResult !== undefined) {
    return toolResult.toolResult
  }

  return { ok: false, error: 'Invalid tool response shape' }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
