import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getLatestFilings,
  getSecIngestSkipReason,
  parseAtomFeed,
  pollSecEdgar,
} from '../../signals/secEdgar'

const atomXml = `
  <feed>
    <entry>
      <id>sec-1</id>
      <title>Apple Inc. (8-K)</title>
      <updated>2025-01-01T10:00:00Z</updated>
    </entry>
    <entry>
      <id>sec-2</id>
      <title>Microsoft Corp (10-Q)</title>
      <updated>2025-01-01T11:00:00Z</updated>
    </entry>
  </feed>
`

describe('secEdgar helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses atom entries', () => {
    const entries = parseAtomFeed(atomXml)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ id: 'sec-1', form: '8-K', company: 'Apple Inc.' })
  })

  it('polls SEC atom feed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => atomXml,
    })
    vi.stubGlobal('fetch', mockFetch)

    const events = await pollSecEdgar(mockFetch as unknown as typeof fetch)
    expect(events.length).toBe(2)
    expect(events[0].source).toBe('sec_edgar')
  })

  it('fetches latest filings for a symbol', async () => {
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('company_tickers.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          cik: '0000320193',
          name: 'Apple Inc.',
          tickers: ['AAPL'],
          filings: {
            recent: {
              filingDate: ['2025-01-02', '2025-01-01'],
              form: ['8-K', 'S-1'],
            },
          },
        }),
      })
    }) as unknown as typeof fetch
    vi.stubGlobal('fetch', mockFetch)

    const items = await getLatestFilings('AAPL', 5, mockFetch)
    expect(items.length).toBe(1)
    expect(items[0].headline).toContain('Apple Inc.')
    expect(items[0].source).toBe('sec_edgar')
  })

  it('returns ingest skip reasons correctly', () => {
    expect(getSecIngestSkipReason({ marketOpen: false, killSwitchActive: false })).toBe(
      'market_closed'
    )
    expect(getSecIngestSkipReason({ marketOpen: true, killSwitchActive: true })).toBe(
      'kill_switch_active'
    )
    expect(getSecIngestSkipReason({ marketOpen: true, killSwitchActive: false })).toBeNull()
  })
})
