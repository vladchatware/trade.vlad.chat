import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function getCronNamesFromSource(): Set<string> {
  const filePath = path.join(process.cwd(), 'convex', 'crons.ts')
  const source = fs.readFileSync(filePath, 'utf8')
  const names = new Set<string>()
  const regex = /crons\.(?:cron|interval)\(\s*'([^']+)'/g
  let match = regex.exec(source)
  while (match !== null) {
    if (match[1]) names.add(match[1])
    match = regex.exec(source)
  }
  return names
}

describe('cron plan', () => {
  it('contains trading, sec-edgar, ops, staleness, overnight, and approvals jobs', () => {
    const names = getCronNamesFromSource()
    expect(names.has('run-trading')).toBe(true)
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
