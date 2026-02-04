import type { SignalResearch } from './types'

export function isGoodSignalResearch(research: SignalResearch) {
  const quality = (research.entryQuality || 'fair').toLowerCase()
  return research.verdict === 'BUY' && (quality === 'good' || quality === 'excellent')
}
