import { describe, expect, it } from 'vitest'
import { CRON_PLAN } from './crons'

describe('cron plan', () => {
  it('contains trading, crypto, agent, sec-edgar, ops, staleness, overnight, and approvals jobs', () => {
    const names = new Set(CRON_PLAN.map((job) => job.name))
    expect(names.has('run-trading')).toBe(true)
    expect(names.has('run-crypto')).toBe(true)
    expect(names.has('agent-v2-cycle')).toBe(true)
    expect(names.has('sec-edgar-ingest')).toBe(true)
    expect(names.has('market-open-prep')).toBe(true)
    expect(names.has('market-close-cleanup')).toBe(true)
    expect(names.has('midnight-reset')).toBe(true)
    expect(names.has('hourly-cache-refresh')).toBe(true)
    expect(names.has('cleanup-order-approvals')).toBe(true)
    expect(names.has('compute-staleness')).toBe(true)
    expect(names.has('overnight-activity-rollup')).toBe(true)
    expect(names.has('premarket-plan')).toBe(true)
  })
})
